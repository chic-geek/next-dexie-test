# Dexie.js Usage Guide

This document covers how Dexie.js (v4) is used in this project to provide client-side IndexedDB storage, integrated with TanStack Query for cache management.

## Architecture Overview

```
db/                          # Database definition and schema
  index.ts                   # DB class + singleton export
  schema/
    index.ts                 # Schema versioning orchestrator
    schema-v1.ts             # v1: people table
    schema-v2.ts             # v2: added pets table

features/<feature>/          # Per-feature data layer
  types.ts                   # Type definitions
  storage.ts                 # Raw Dexie queries (reads + writes)
  services.ts                # TanStack Query hooks (useQuery / useMutation)
  query-keys.ts              # Query key constants
  components/ui/             # React components
```

The key principle is **separation of concerns** within each feature:

- `storage.ts` contains all direct Dexie calls (pure async functions, no React)
- `services.ts` wraps those with TanStack Query hooks for use in components
- Components never import from `db/` directly; they go through `services.ts`

Dexie is client-side only (IndexedDB). There is no server-side database. All pages that use Dexie are `"use client"` components.

## Database Definition

`db/index.ts` defines the database class:

```ts
class AppDB extends Dexie {
  people!: Table<Person, number>;
  pets!: Table<Pet, number>;

  constructor() {
    super("AppDB");   // IndexedDB database name
    schema(this);
  }
}

export const db = new AppDB();
```

- `Table<Person, number>` means the table stores `Person` records with `number` primary keys.
- The `db` singleton is imported wherever Dexie access is needed.

## Schema and Versioning

Schema versions are defined in `db/schema/` and applied in `db/schema/index.ts`:

```ts
export function schema(db: Dexie) {
  db.version(1).stores(schemaV1);
  db.version(2).stores(schemaV2);
}
```

Each version file exports a store definition object:

```ts
// schema-v1.ts
export const schemaV1 = {
  people: "++id, createdAt",
} as const;

// schema-v2.ts
export const schemaV2 = {
  people: "++id, createdAt",
  pets: "++id, createdAt, ownerPersonId",
} as const;
```

### Index syntax

| Syntax  | Meaning                           |
|---------|-----------------------------------|
| `++id`  | Auto-increment primary key        |
| `field` | Indexed field (enables queries)   |

Only indexed fields can be used in `.orderBy()`, `.where()`, etc. Non-indexed fields are still stored, they just can't be queried efficiently.

### Adding a new version

1. Create `db/schema/schema-v3.ts` with the full store definitions (all tables, not just changes).
2. Add `db.version(3).stores(schemaV3)` in `db/schema/index.ts`.
3. If you need data migration, chain `.upgrade(tx => { ... })` after `.stores()`.
4. Update the table declarations in `db/index.ts` if new tables were added.

Dexie handles the upgrade automatically when the browser opens the database and finds a newer version.

## Types

Each feature defines its own types:

```ts
// features/people/types.ts
export type Person = {
  id?: number;         // optional because auto-generated
  firstName: string;
  lastName: string;
  age: number;
  createdAt: number;   // Date.now() timestamp
};

export type NewPerson = Omit<Person, "id" | "createdAt">;
```

```ts
// features/pets/types.ts
export type PetSpecies = "dog" | "cat" | "other";

export type Pet = {
  id?: number;
  name: string;
  species: PetSpecies;
  ownerPersonId?: number;   // references Person.id (not enforced by DB)
  createdAt: number;
};

export type NewPet = Omit<Pet, "id" | "createdAt">;
```

The `New*` types strip `id` and `createdAt` since those are generated on insert.

## Querying Data

Queries live in `storage.ts` as plain async functions:

```ts
// features/people/storage.ts
export async function listPeopleNewestFirst() {
  return db.people.orderBy("createdAt").reverse().toArray();
}
```

Common Dexie query methods:

| Method                          | Description                          |
|---------------------------------|--------------------------------------|
| `table.toArray()`               | Get all records                      |
| `table.get(id)`                 | Get one record by primary key        |
| `table.orderBy("field")`        | Sort by indexed field (ascending)    |
| `.reverse()`                    | Reverse sort order (descending)      |
| `table.where("field").equals(v)`| Filter by indexed field              |
| `.toArray()`                    | Execute and return results as array  |

## Writing Data

Mutations also live in `storage.ts`:

```ts
// features/people/storage.ts
export async function addPerson(input: NewPerson) {
  return db.people.add({
    ...input,
    createdAt: Date.now(),
  });
}
```

Common Dexie write methods:

| Method                  | Description                                    |
|-------------------------|------------------------------------------------|
| `table.add(obj)`        | Insert a new record (fails if key exists)      |
| `table.put(obj)`        | Insert or replace (upsert)                     |
| `table.update(id, obj)` | Partial update of an existing record           |
| `table.delete(id)`      | Delete by primary key                          |
| `table.bulkAdd(arr)`    | Insert multiple records                        |
| `table.bulkPut(arr)`    | Upsert multiple records                        |
| `table.bulkDelete(ids)` | Delete multiple records by key                 |

## TanStack Query Integration

`services.ts` wraps storage functions with TanStack Query hooks:

### Queries

```ts
// features/people/services.ts
export function usePeopleQuery() {
  return useQuery({
    queryKey: peopleKeys.all,
    queryFn: listPeopleNewestFirst,
  });
}
```

### Mutations

```ts
export function useAddPersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addPerson,
    onSuccess: () => qc.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}
```

The pattern is:

1. Define query keys in `query-keys.ts` (e.g. `{ all: ["people"] as const }`)
2. Wrap reads with `useQuery`, pointing `queryFn` at the storage function
3. Wrap writes with `useMutation`, invalidating relevant queries `onSuccess`

This gives you caching, loading/error states, and automatic refetching after mutations.

### Query keys

Query keys are kept in a dedicated file per feature:

```ts
// features/people/query-keys.ts
export const peopleKeys = {
  all: ["people"] as const,
};
```

If you add filtered or parameterized queries, extend the keys object:

```ts
export const peopleKeys = {
  all: ["people"] as const,
  byId: (id: number) => ["people", id] as const,
};
```

## Adding a New Feature

To add a new feature (e.g. "toys"):

1. **Schema** - Create `db/schema/schema-v3.ts` with the new table, add `db.version(3).stores(schemaV3)` to `db/schema/index.ts`, and add the table declaration to `db/index.ts`.

2. **Types** - Create `features/toys/types.ts` with `Toy` and `NewToy` types.

3. **Storage** - Create `features/toys/storage.ts` with Dexie query/mutation functions.

4. **Query keys** - Create `features/toys/query-keys.ts`.

5. **Services** - Create `features/toys/services.ts` with `useToysQuery()` and `useAddToyMutation()` hooks.

6. **Components** - Create form and list components under `features/toys/components/ui/`.

7. **Page** - Create `app/toys/page.tsx` to render the components.

## Relationships

Relationships between tables (e.g. `Pet.ownerPersonId -> Person.id`) are **not enforced** by Dexie/IndexedDB. They are convention-based. To resolve a relationship, query the related table manually:

```ts
// Get all pets for a person
const pets = await db.pets.where("ownerPersonId").equals(personId).toArray();

// Get the owner of a pet
const owner = pet.ownerPersonId ? await db.people.get(pet.ownerPersonId) : undefined;
```

## Transactions

For operations that need atomicity (multiple writes that must all succeed or all fail):

```ts
await db.transaction("rw", db.people, db.pets, async () => {
  const personId = await db.people.add({ ... });
  await db.pets.add({ ..., ownerPersonId: personId });
});
```

The `"rw"` flag means read-write. List all tables involved after it.

## Key Dependencies

| Package               | Role                                      |
|-----------------------|-------------------------------------------|
| `dexie` ^4.3.0       | IndexedDB wrapper                         |
| `@tanstack/react-query` ^5.90.20 | Cache management + React hooks |
| `react-hook-form` ^7.71.1 | Form state management               |
