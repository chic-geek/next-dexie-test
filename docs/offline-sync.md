# Offline-First Sync Architecture

This document describes the two-phase offline sync pattern used in this project. It is designed to be replicated in other apps where offline support is a hard requirement (e.g. a workout tracker used in a gym without connectivity).

---

## Core Principle

**Reads always come from Dexie (IndexedDB). Writes go to Dexie first, then to the server.**

The user never waits for a network round-trip to see their data or to have their changes accepted. The server is the durable backup, not the primary source of truth during a session.

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│                 Browser                 │
│                                         │
│  Component                              │
│     │                                   │
│  TanStack Query (networkMode: "always") │
│     │                                   │
│  storage.ts                             │
│     ├── 1. Write to Dexie (instant)     │
│     └── 2. fetch() to API (background)  │
│                                         │
│  Dexie / IndexedDB  ◄── reads always    │
└─────────────────────────────────────────┘
          │ (when online)
          ▼
┌─────────────────────────────────────────┐
│              Next.js API Routes         │
│              Drizzle → Neon Postgres    │
└─────────────────────────────────────────┘
```

---

## Phase 1: Write-Through

Every entity has two sync fields:

```typescript
type Person = {
  id: string;              // UUID, generated client-side
  // ... entity fields
  pendingSync: boolean;    // true = not yet confirmed by server
  pendingDelete: boolean;  // true = deleted offline, awaiting server confirmation
};
```

### Create / Update (online)

1. Generate a UUID client-side (`crypto.randomUUID()`)
2. Write to Dexie with `pendingSync: true`
3. UI re-renders immediately (TanStack Query invalidates the local Dexie query)
4. Fire-and-forget `fetch` to the API in the background
5. On server success: update Dexie to `pendingSync: false`
6. On server failure: `pendingSync` stays `true` — Phase 2 sync service picks it up

```typescript
export async function addPerson(input: NewPerson): Promise<Person> {
  const person: Person = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingSync: true,
    pendingDelete: false,
  };
  await db.people.add(person);   // 1. local write — instant
  syncPerson(person);            // 2. background server write
  return person;
}
```

### Create / Update (offline)

Identical flow — the fire-and-forget `fetch` simply fails and `.catch()` suppresses the error. `pendingSync` stays `true`. The sync service handles it when connectivity returns.

### Delete (online)

Hard-delete from Dexie immediately, fire DELETE request to server in the background.

### Delete (offline)

Soft-delete: set `pendingDelete: true, pendingSync: true` in Dexie. The record disappears from the UI immediately (list queries filter `!pendingDelete`), but stays in Dexie so the sync service can tell the server about it later.

```typescript
export async function deletePerson(id: string): Promise<void> {
  if (navigator.onLine) {
    await db.people.delete(id);
    syncPersonDelete(id);
  } else {
    await db.people.update(id, { pendingDelete: true, pendingSync: true });
  }
}
```

List queries filter out soft-deleted records:

```typescript
export async function listPeopleNewestFirst(): Promise<Person[]> {
  return db.people
    .orderBy("createdAt")
    .reverse()
    .filter((p) => !p.pendingDelete)
    .toArray();
}
```

---

## Phase 2: Sync Service (`lib/sync.ts`)

The sync service runs on:
- **App mount** (with an active session) — flushes anything pending from a previous offline session
- **`window` online event** — flushes immediately when connectivity returns

```typescript
export async function syncPendingChanges(): Promise<void> {
  const pendingPeople = await db.people.filter((p) => p.pendingSync).toArray();

  await Promise.allSettled(
    pendingPeople.map(async (person) => {
      if (person.pendingDelete) {
        const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          await db.people.delete(person.id); // hard-delete after server confirms
        }
      } else {
        const res = await fetch(`/api/people/${person.id}`, {
          method: "PUT",    // upsert — works for both creates and updates
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(person),
        });
        if (res.ok) {
          await db.people.update(person.id, { pendingSync: false });
        }
      }
    })
  );
}
```

Key design decisions:

- **`Promise.allSettled` not `Promise.all`** — one failure doesn't abort the rest
- **`PUT` (upsert) not `POST` or `PATCH`** — the sync service doesn't need to know whether the record was created or updated offline; the server handles both via `INSERT ... ON CONFLICT DO UPDATE`
- **404 treated as success for deletes** — if the record never reached the server in the first place, there's nothing to delete; clean up Dexie and move on

---

## Hydration on Login (`lib/hydrate.ts`)

When a user logs in, their server data is pulled into Dexie so reads work immediately on any device.

```typescript
export async function hydrateFromServer(): Promise<void> {
  // Only run once per tab — sessionStorage (not the auth session) is cleared on tab close
  if (sessionStorage.getItem("hydratedAt")) return;

  const [peopleRes, petsRes] = await Promise.all([
    fetch("/api/people"),
    fetch("/api/pets"),
  ]);
  if (!peopleRes.ok || !petsRes.ok) return;

  // Load local records into a map for O(1) updatedAt comparison
  const localPeople = await db.people.toArray();
  const localPeopleMap = new Map(localPeople.map((p) => [p.id, p]));

  await db.people.bulkPut(
    serverPeople
      .filter((p) => {
        const local = localPeopleMap.get(p.id);
        if (local?.pendingSync) return false; // local edits always win
        if (!local) return true;              // missing locally — pull it in
        return new Date(p.updatedAt).getTime() > local.updatedAt; // server is newer
      })
      .map(serverPersonToDexie)
  );

  sessionStorage.setItem("hydratedAt", Date.now().toString());
}
```

**Conflict resolution:** Dexie is the source of truth. For each server record, hydration applies a three-way check:

1. **`pendingSync: true` locally** — skip. Local edits always win, regardless of timestamps.
2. **Record missing locally** — pull it in. Covers a new device or a cleared IndexedDB.
3. **`updatedAt` comparison** — only overwrite if the server version is strictly newer than the local one.

This means local changes are never overwritten by stale server data, even when the `sessionStorage` guard clears (i.e. the tab is closed and reopened).

---

## API Route Pattern

All data routes use the session to scope queries to the current user. The client never sends `userId` — the server always reads it from the session.

```typescript
// app/api/people/route.ts
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const people = await db.select().from(schema.people)
    .where(eq(schema.people.userId, session.user.id))
    .orderBy(desc(schema.people.createdAt));

  return Response.json(people);
}
```

The sync service uses a `PUT` upsert endpoint:

```typescript
// app/api/people/[id]/route.ts
export async function PUT(req, { params }) {
  // ...session check...
  await db.insert(schema.people)
    .values({ id, userId: session.user.id, ...body })
    .onConflictDoUpdate({
      target: schema.people.id,
      set: { ...body, updatedAt: new Date() },
    });
}
```

---

## TanStack Query Configuration

**Critical:** TanStack Query's default `networkMode: "online"` pauses mutations when the browser reports offline. This causes the UI to hang in a "saving" state forever because the mutation never executes — the Dexie write never happens.

Set `networkMode: "always"` on the `QueryClient` so TanStack Query always runs queries and mutations regardless of network status. The storage layer owns all offline/online logic.

```typescript
new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always" },
    mutations: { networkMode: "always" },
  },
})
```

---

## ID Strategy: Client-Generated UUIDs

Both Dexie and Postgres use the same UUID for each record. The UUID is generated client-side before any writes:

```typescript
id: crypto.randomUUID()
```

This means:
- No mapping table between local IDs and server IDs
- A record can be written to Postgres with its correct ID even if it was created entirely offline
- The upsert (`ON CONFLICT DO UPDATE`) just works — same ID everywhere

**Important:** Dexie cannot change a table's primary key type via a migration. If migrating from auto-increment integer IDs to UUIDs, rename the IndexedDB database (e.g. `"AppDB"` → `"AppDB_2"`) to create a fresh database with the correct schema. Data is recovered from the server on the next login via hydration.

---

## Wiring It Together (`providers.tsx`)

```typescript
React.useEffect(() => {
  if (!session?.user) return;

  hydrateFromServer().catch(console.error);
  syncPendingChanges().catch(console.error);

  function handleOnline() {
    syncPendingChanges().catch(console.error);
  }
  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}, [session?.user?.id]);
```

---

## Replication Checklist

When adding this pattern to a new app:

- [ ] Add `pendingSync: boolean` and `pendingDelete: boolean` to every entity type
- [ ] Use `crypto.randomUUID()` for all IDs (client-generated)
- [ ] Add `updatedAt: number` to every entity type
- [ ] Dexie schema indexes `pendingSync` field
- [ ] `storage.ts` writes to Dexie first, then fires server request
- [ ] List queries filter `!pendingDelete`
- [ ] `deleteFoo` soft-deletes when offline, hard-deletes when online
- [ ] API routes have `PUT` upsert endpoints (for sync service)
- [ ] `lib/sync.ts` covers all entity tables
- [ ] `lib/hydrate.ts` maps server (camelCase, ISO timestamps) → Dexie (camelCase, Unix ms)
- [ ] `QueryClient` has `networkMode: "always"` for both queries and mutations
- [ ] `providers.tsx` calls `syncPendingChanges` on mount and on `online` event
- [ ] `providers.tsx` calls `hydrateFromServer` when session is established
