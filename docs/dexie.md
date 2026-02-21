# Dexie.js Usage Guide

This document covers how Dexie.js (v4) is used in this project as the offline-first local store, integrated with TanStack Query for cache management.

---

## Role of Dexie in this architecture

Dexie is the **primary data store during a session**. All reads come from Dexie, all writes go to Dexie first. Postgres is the durable backup — not the read source.

This means the app works fully offline for reads and writes. See [`docs/offline-sync.md`](./offline-sync.md) for the full sync pattern.

---

## File Structure

```
db/dexie/
  index.ts          ← AppDB class + singleton export
  schema/
    index.ts        ← applies schema versions to the Dexie instance
    schema-v3.ts    ← current schema (UUID PKs, userId, sync fields)
```

The database is imported from `@/db/dexie` throughout the codebase.

---

## Database Class (`db/dexie/index.ts`)

```typescript
import { Dexie, type Table } from "dexie";
import { schema } from "./schema";
import { Person } from "@/features/people/types";
import { Pet } from "@/features/pets/types";

class AppDB extends Dexie {
  people!: Table<Person, string>;  // string = primary key type (UUID)
  pets!: Table<Pet, string>;

  constructor() {
    super("AppDB_2");  // see note below on the name
    schema(this);
  }
}

export const db = new AppDB();
```

**Why `"AppDB_2"`?** Dexie cannot change a table's primary key type via a migration. The original database (`"AppDB"`) used auto-increment integer IDs. When the schema changed to UUID string IDs, renaming the database to `"AppDB_2"` was the only safe option — it creates a fresh IndexedDB instance with the correct schema. Data is recovered from Postgres on the next login via hydration.

---

## Schema (`db/dexie/schema/schema-v3.ts`)

```typescript
export const schemaV3 = {
  people: "id, userId, createdAt, pendingSync",
  pets:   "id, userId, createdAt, ownerPersonId, pendingSync",
} as const;
```

The first field in the string is the primary key. Subsequent fields are indexes — only indexed fields can be used in `.orderBy()` or `.where()`. Non-indexed fields (e.g. `firstName`, `pendingDelete`) are stored but can only be filtered with `.filter()`.

### Schema version management (`db/dexie/schema/index.ts`)

```typescript
import type { Dexie } from "dexie";
import { schemaV3 } from "./schema-v3";

export function schema(db: Dexie) {
  db.version(1).stores(schemaV3);
}
```

Because `"AppDB_2"` started fresh, it only has version 1. Future schema changes increment this version number.

### Adding a new schema version

1. Create `db/dexie/schema/schema-v4.ts` with the **full** store definitions (all tables, not just changed ones).
2. Add `db.version(2).stores(schemaV4)` in `db/dexie/schema/index.ts`.
3. Add the new table declaration to `db/dexie/index.ts` if you added a table.
4. Chain `.upgrade(tx => { ... })` if you need to migrate existing data.

Dexie handles the upgrade automatically when the browser opens the database and finds a newer version.

---

## Entity Types

Every entity follows the same shape — a client-generated UUID primary key, a `userId` for tenant scoping, timestamps, and two sync flags:

```typescript
// features/people/types.ts
export type Person = {
  id: string;              // UUID — crypto.randomUUID(), generated before any write
  userId?: string;         // better-auth user ID — set at creation time
  firstName: string;
  lastName: string;
  age: number;
  createdAt: number;       // Unix ms — Date.now()
  updatedAt: number;       // Unix ms — updated on every write
  pendingSync: boolean;    // true = not yet confirmed by server
  pendingDelete: boolean;  // true = soft-deleted, awaiting server confirmation
};

export type NewPerson = Omit<
  Person,
  "id" | "userId" | "createdAt" | "updatedAt" | "pendingSync" | "pendingDelete"
>;
```

The `New*` type strips all system-generated fields. It is used as the form input type.

---

## Querying Data

Reads live in `storage.ts` as plain async functions. All list queries are scoped to the signed-in user and filter out soft-deleted records:

```typescript
// features/people/storage.ts
export async function listPeopleNewestFirst(userId: string): Promise<Person[]> {
  return db.people
    .orderBy("createdAt")
    .reverse()
    .filter((p) => p.userId === userId && !p.pendingDelete)
    .toArray();
}
```

**Important:** `pendingDelete` is not indexed, so it must use `.filter()` rather than `.where()`. Dexie's `.filter()` is a JS-level filter applied after the index scan — it works correctly but cannot use an index.

### Common Dexie query methods

| Method | Description |
|---|---|
| `table.toArray()` | All records |
| `table.get(id)` | Single record by primary key |
| `table.orderBy("field")` | Sort by indexed field (ascending) |
| `.reverse()` | Reverse sort order |
| `table.where("field").equals(v)` | Filter by indexed field |
| `.filter(fn)` | JS-level filter (use for non-indexed fields) |
| `.toArray()` | Execute and return results |

---

## Writing Data

### Create

Generate a UUID client-side and set all system fields before writing to Dexie. `userId` is set at creation time — never rely on hydration to fill it in later.

```typescript
export async function addPerson(input: NewPerson, userId: string): Promise<Person> {
  const person: Person = {
    id: crypto.randomUUID(),
    ...input,
    userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingSync: true,    // will be cleared when server confirms
    pendingDelete: false,
  };
  await db.people.add(person);
  return person;
}
```

### Update

Stamp `updatedAt` and set `pendingSync: true` on every update so the sync service picks it up if the server request fails:

```typescript
export async function updatePerson(id: string, updates: Partial<NewPerson>): Promise<void> {
  await db.people.update(id, { ...updates, updatedAt: Date.now(), pendingSync: true });
}
```

### Delete

Always soft-delete first. Hard-delete only after the server confirms:

```typescript
export async function deletePerson(id: string): Promise<void> {
  // Soft-delete first — preserves the record for the sync service if the
  // server request fails.
  await db.people.update(id, { pendingDelete: true, pendingSync: true });

  if (navigator.onLine) {
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      await db.people.delete(id); // hard-delete only after server confirms
    }
  }
}
```

### Common Dexie write methods

| Method | Description |
|---|---|
| `table.add(obj)` | Insert (fails if key exists) |
| `table.put(obj)` | Insert or replace (upsert) |
| `table.update(id, partial)` | Partial update of an existing record |
| `table.delete(id)` | Hard-delete by primary key |
| `table.bulkAdd(arr)` | Insert multiple records |
| `table.bulkPut(arr)` | Upsert multiple records |
| `table.bulkDelete(ids)` | Delete multiple records by key |

---

## TanStack Query Integration

`services.ts` wraps storage functions with TanStack Query hooks. The session's `userId` is read here and threaded down into the storage functions.

### Query

```typescript
// features/people/services.ts
export function usePeopleQuery() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: peopleKeys.all,
    queryFn: () => listPeopleNewestFirst(userId!),
    enabled: !!userId,  // don't run before session is available
  });
}
```

### Mutation

```typescript
export function useAddPersonMutation() {
  const qc = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (input: NewPerson) => addPerson(input, session!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: peopleKeys.all });
      toast.success("Person added.");
    },
  });
}
```

The pattern is always: write to Dexie → invalidate the query → TanStack Query re-runs the `queryFn` → reads fresh data from Dexie. The UI never directly depends on the server response.

### Query keys

```typescript
// features/people/query-keys.ts
export const peopleKeys = {
  all: ["people"] as const,
};
```

---

## Transactions

For operations that must be atomic across multiple tables:

```typescript
await db.transaction("rw", db.people, db.pets, async () => {
  await db.people.add({ ... });
  await db.pets.add({ ... });
});
```

List all tables involved after the `"rw"` flag. If any operation inside throws, Dexie rolls back all changes.

---

## Relationships

Relationships (e.g. `Pet.ownerPersonId → Person.id`) are not enforced by IndexedDB. They are convention-based. Query the related table manually:

```typescript
// All pets for a person
const pets = await db.pets.where("ownerPersonId").equals(personId).toArray();

// Owner of a pet
const owner = pet.ownerPersonId ? await db.people.get(pet.ownerPersonId) : null;
```
