# Adding a New Entity

This guide walks through every file you need to create or modify to add a new entity to the sync architecture. We'll use **workouts** as the example.

The full list of touch points:

1. `features/workouts/types.ts` — TypeScript types
2. `db/dexie/schema/schema-v4.ts` + `db/dexie/schema/index.ts` — Dexie schema version
3. `db/dexie/index.ts` — register the new table
4. `db/neon/schema.ts` — Postgres table
5. `features/workouts/storage.ts` — Dexie reads/writes + write-through sync
6. `features/workouts/query-keys.ts` — TanStack Query key constants
7. `features/workouts/services.ts` — TanStack Query hooks
8. `app/api/workouts/route.ts` — GET (list) + POST (create)
9. `app/api/workouts/[id]/route.ts` — PATCH (update) + PUT (upsert) + DELETE
10. `lib/sync.ts` — flush pending workouts to server
11. `lib/hydrate.ts` — pull server workouts into Dexie on login
12. Run the Drizzle migration

---

## 1. Types (`features/workouts/types.ts`)

Every entity has the same system fields: a client-generated UUID, `userId`, Unix ms timestamps, and two sync flags.

```typescript
export type Workout = {
  id: string;              // UUID — crypto.randomUUID()
  userId?: string;         // better-auth user ID — set at creation time
  name: string;
  durationMinutes: number;
  createdAt: number;       // Unix ms
  updatedAt: number;       // Unix ms
  pendingSync: boolean;    // true = not yet confirmed by server
  pendingDelete: boolean;  // true = soft-deleted, awaiting server confirmation
};

export type NewWorkout = Omit<
  Workout,
  "id" | "userId" | "createdAt" | "updatedAt" | "pendingSync" | "pendingDelete"
>;
```

---

## 2. Dexie Schema

**`db/dexie/schema/schema-v4.ts`** — copy all existing tables and add the new one. Dexie requires the full store definition in every version, not just the diff.

```typescript
export const schemaV4 = {
  people:   "id, userId, createdAt, pendingSync",
  pets:     "id, userId, createdAt, ownerPersonId, pendingSync",
  workouts: "id, userId, createdAt, pendingSync",
} as const;
```

Index `id`, `userId`, `createdAt`, and `pendingSync` on every entity. Add any fields you'll query with `.where()` (e.g. a foreign key like `ownerPersonId`). Fields only used in `.filter()` don't need to be indexed.

**`db/dexie/schema/index.ts`** — add the new version:

```typescript
import type { Dexie } from "dexie";
import { schemaV3 } from "./schema-v3";
import { schemaV4 } from "./schema-v4";

export function schema(db: Dexie) {
  db.version(1).stores(schemaV3);
  db.version(2).stores(schemaV4);
}
```

---

## 3. Register the Table (`db/dexie/index.ts`)

```typescript
import { Dexie, type Table } from "dexie";
import { schema } from "./schema";
import { Person } from "@/features/people/types";
import { Pet } from "@/features/pets/types";
import { Workout } from "@/features/workouts/types";  // add this

class AppDB extends Dexie {
  people!: Table<Person, string>;
  pets!: Table<Pet, string>;
  workouts!: Table<Workout, string>;  // add this

  constructor() {
    super("AppDB_2");
    schema(this);
  }
}

export const db = new AppDB();
```

---

## 4. Postgres Table (`db/neon/schema.ts`)

```typescript
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

Design notes:
- `uuid` primary key — same UUID as Dexie, no mapping table needed
- `userId` FK with `onDelete: "cascade"` — deleting a user removes all their data
- No `pendingSync`/`pendingDelete` columns — those are Dexie-only fields; Postgres never sees them

---

## 5. Storage (`features/workouts/storage.ts`)

```typescript
import { db } from "@/db/dexie";
import type { NewWorkout, Workout } from "./types";

// ─── Background server sync helpers ──────────────────────────────────────────

function syncWorkout(workout: Workout) {
  fetch("/api/workouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workout),
  })
    .then(async (res) => {
      if (res.ok) await db.workouts.update(workout.id, { pendingSync: false });
    })
    .catch(() => {
      /* offline — pendingSync stays true, sync service retries on reconnect */
    });
}

function syncWorkoutUpdate(id: string, updates: object) {
  fetch(`/api/workouts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
    .then(async (res) => {
      if (res.ok) await db.workouts.update(id, { pendingSync: false });
    })
    .catch(() => {});
}

// ─── Public storage functions ─────────────────────────────────────────────────

export async function addWorkout(input: NewWorkout, userId: string): Promise<Workout> {
  const workout: Workout = {
    id: crypto.randomUUID(),
    ...input,
    userId,                // always set at creation — never rely on hydration
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingSync: true,
    pendingDelete: false,
  };
  await db.workouts.add(workout);
  syncWorkout(workout);    // fire-and-forget
  return workout;
}

export async function listWorkoutsNewestFirst(userId: string): Promise<Workout[]> {
  return db.workouts
    .orderBy("createdAt")
    .reverse()
    .filter((w) => w.userId === userId && !w.pendingDelete)
    .toArray();
}

export async function deleteWorkout(id: string): Promise<void> {
  // Soft-delete first — preserves the record for retry if the server request fails.
  await db.workouts.update(id, { pendingDelete: true, pendingSync: true });

  if (navigator.onLine) {
    const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      await db.workouts.delete(id); // hard-delete only after server confirms
    }
  }
}

export async function updateWorkout(id: string, updates: Partial<NewWorkout>): Promise<void> {
  const updatedAt = Date.now();
  await db.workouts.update(id, { ...updates, updatedAt, pendingSync: true });
  syncWorkoutUpdate(id, { ...updates, updatedAt });
}
```

---

## 6. Query Keys (`features/workouts/query-keys.ts`)

```typescript
export const workoutKeys = {
  all: ["workouts"] as const,
};
```

---

## 7. TanStack Query Hooks (`features/workouts/services.ts`)

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { workoutKeys } from "./query-keys";
import { addWorkout, deleteWorkout, listWorkoutsNewestFirst, updateWorkout } from "./storage";
import type { NewWorkout } from "./types";

export function useWorkoutsQuery() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: workoutKeys.all,
    queryFn: () => listWorkoutsNewestFirst(userId!),
    enabled: !!userId,
  });
}

export function useAddWorkoutMutation() {
  const qc = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (input: NewWorkout) => addWorkout(input, session!.user.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.all }),
  });
}

export function useDeleteWorkoutMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.all }),
  });
}

export function useUpdateWorkoutMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<NewWorkout> }) =>
      updateWorkout(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.all }),
  });
}
```

---

## 8. API Routes — List + Create (`app/api/workouts/route.ts`)

```typescript
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const workouts = await db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.userId, session.user.id))
    .orderBy(desc(schema.workouts.createdAt));

  return Response.json(workouts);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const [workout] = await db
    .insert(schema.workouts)
    .values({
      id: body.id,                    // client-generated UUID
      userId: session.user.id,        // always from session, never from client
      name: body.name,
      durationMinutes: body.durationMinutes,
    })
    .returning();

  return Response.json(workout, { status: 201 });
}
```

---

## 9. API Routes — Update + Upsert + Delete (`app/api/workouts/[id]/route.ts`)

```typescript
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

// PUT — upsert used by the sync service to flush offline writes.
// Works whether the record was created online (already in Postgres) or
// offline (first time Postgres sees it).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [upserted] = await db
    .insert(schema.workouts)
    .values({
      id,
      userId: session.user.id,
      name: body.name,
      durationMinutes: body.durationMinutes,
    })
    .onConflictDoUpdate({
      target: schema.workouts.id,
      set: {
        name: body.name,
        durationMinutes: body.durationMinutes,
        updatedAt: new Date(),
      },
      // Ownership guard: only update the row if it belongs to this user.
      // If the UUID belongs to another user, the update is a no-op.
      setWhere: eq(schema.workouts.userId, session.user.id),
    })
    .returning();

  // 409 tells the sync service to leave pendingSync: true — don't silently
  // treat a blocked cross-tenant write as a success.
  if (!upserted) return new Response("Conflict", { status: 409 });

  return Response.json(upserted);
}

// PATCH — online update from write-through sync.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(schema.workouts)
    .set({ name: body.name, durationMinutes: body.durationMinutes, updatedAt: new Date() })
    .where(
      and(
        eq(schema.workouts.id, id),
        eq(schema.workouts.userId, session.user.id)  // scope to owner
      )
    )
    .returning();

  if (!updated) return new Response("Not found", { status: 404 });

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  await db
    .delete(schema.workouts)
    .where(
      and(
        eq(schema.workouts.id, id),
        eq(schema.workouts.userId, session.user.id)
      )
    );

  return new Response(null, { status: 204 });
}
```

---

## 10. Sync Service (`lib/sync.ts`)

Add a parallel flush loop for the new entity alongside the existing ones:

```typescript
export async function syncPendingChanges(userId: string): Promise<void> {
  const [pendingPeople, pendingPets, pendingWorkouts] = await Promise.all([
    db.people.filter((p) => p.userId === userId && p.pendingSync).toArray(),
    db.pets.filter((p) => p.userId === userId && p.pendingSync).toArray(),
    db.workouts.filter((w) => w.userId === userId && w.pendingSync).toArray(),  // add
  ]);

  // ... existing people and pets loops ...

  await Promise.allSettled(
    pendingWorkouts.map(async (workout) => {
      if (workout.pendingDelete) {
        const res = await fetch(`/api/workouts/${workout.id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) await db.workouts.delete(workout.id);
      } else {
        const res = await fetch(`/api/workouts/${workout.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workout),
        });
        if (res.ok) await db.workouts.update(workout.id, { pendingSync: false });
      }
    })
  );
}
```

---

## 11. Hydration (`lib/hydrate.ts`)

Add a `ServerWorkout` type, a mapping function, and a `bulkPut` call alongside the existing ones:

```typescript
// Add to the server types at the top of the file
type ServerWorkout = {
  id: string;
  userId: string;
  name: string;
  durationMinutes: number;
  createdAt: string;   // ISO string after Response.json() serialisation
  updatedAt: string;
};

// Add mapping function
function serverWorkoutToDexie(w: ServerWorkout): Workout {
  return {
    id: w.id,
    userId: w.userId,
    name: w.name,
    durationMinutes: w.durationMinutes,
    createdAt: new Date(w.createdAt).getTime(),   // ISO → Unix ms
    updatedAt: new Date(w.updatedAt).getTime(),
    pendingSync: false,
    pendingDelete: false,
  };
}

// Inside hydrateFromServer(), add workouts to the parallel fetch:
const [peopleRes, petsRes, workoutsRes] = await Promise.all([
  fetch("/api/people"),
  fetch("/api/pets"),
  fetch("/api/workouts"),   // add
]);
if (!peopleRes.ok || !petsRes.ok || !workoutsRes.ok) return;

const [serverPeople, serverPets, serverWorkouts] = await Promise.all([
  peopleRes.json(),
  petsRes.json(),
  workoutsRes.json(),   // add
]);

// Add local workouts to the maps
const localWorkouts = await db.workouts.toArray();
const localWorkoutsMap = new Map(localWorkouts.map((w) => [w.id, w]));

// Add bulkPut for workouts (same three-way conflict resolution as people/pets)
await db.workouts.bulkPut(
  serverWorkouts
    .filter((w: ServerWorkout) => {
      const local = localWorkoutsMap.get(w.id);
      if (local?.pendingSync) return false;                            // local edits win
      if (!local) return true;                                         // missing locally
      return new Date(w.updatedAt).getTime() > local.updatedAt;       // server is newer
    })
    .map(serverWorkoutToDexie)
);
```

---

## 12. Run the Migration

```bash
npx drizzle-kit generate   # generates the SQL for the new workouts table
npx drizzle-kit migrate    # applies it to Neon
```

Commit the generated migration file in `db/neon/migrations/`.

---

## Checklist

- [ ] `features/workouts/types.ts` — `Workout` and `NewWorkout` types with all sync fields
- [ ] `db/dexie/schema/schema-v4.ts` — new schema with all tables including `workouts`
- [ ] `db/dexie/schema/index.ts` — `db.version(2).stores(schemaV4)`
- [ ] `db/dexie/index.ts` — `workouts!: Table<Workout, string>`
- [ ] `db/neon/schema.ts` — Postgres table with uuid PK, userId FK, timestamps
- [ ] `features/workouts/storage.ts` — write-through: Dexie first, then background fetch; userId param on all functions; soft-delete-first on delete
- [ ] `features/workouts/query-keys.ts`
- [ ] `features/workouts/services.ts` — userId threaded from session into storage calls; `enabled: !!userId` on queries
- [ ] `app/api/workouts/route.ts` — GET scoped to `session.user.id`; POST uses `session.user.id` not client body
- [ ] `app/api/workouts/[id]/route.ts` — PUT with `setWhere` ownership guard + 409; PATCH and DELETE scoped with `and()`
- [ ] `lib/sync.ts` — workouts flush loop with userId filter
- [ ] `lib/hydrate.ts` — `ServerWorkout` type, mapping function, fetch + bulkPut with three-way conflict resolution
- [ ] `npx drizzle-kit generate && npx drizzle-kit migrate`
