# Architecture Overview

This project is a blueprint for offline-first Next.js applications backed by Postgres. It is designed to be replicated for apps where offline use is a hard requirement — e.g. a workout tracker used in a gym without connectivity.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Local store | Dexie.js (IndexedDB wrapper) |
| Server DB | Neon Postgres (serverless HTTP driver) |
| ORM | Drizzle ORM |
| Auth | better-auth (email/password) |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + Zod |
| UI | shadcn/ui + Tailwind CSS v4 |

---

## Key Architectural Principle

**Reads always come from Dexie. Writes go to Dexie first, then to the server.**

The browser never waits for a network response to display data or accept a write. Dexie is the primary store during a session; Postgres is the durable backup. This makes the app fast and resilient to connectivity issues.

---

## Data Flow

```
READ
  Component
    └── TanStack Query (queryFn)
          └── storage.ts
                └── Dexie (IndexedDB) ← always local, always fast

WRITE (online)
  Component
    └── TanStack Query (mutationFn)
          └── storage.ts
                ├── 1. db.people.add(person)    ← Dexie, instant
                ├── 2. UI re-renders immediately
                └── 3. fetch("/api/people", ...) ← background, fire-and-forget
                        └── on success: pendingSync: false

WRITE (offline)
  Same as above, but fetch() fails silently.
  pendingSync: true stays set.
  On next online event: sync service flushes to server.

LOGIN
  better-auth sets session cookie
    └── providers.tsx detects session
          ├── hydrateFromServer() ← GET /api/people + /api/pets → bulkPut into Dexie
          └── syncPendingChanges() ← flush any pending offline writes
```

---

## Project Structure

```
app/
  api/
    auth/[...all]/route.ts   ← better-auth catch-all
    people/route.ts          ← GET (list), POST (create)
    people/[id]/route.ts     ← PATCH (update), PUT (upsert), DELETE
    pets/route.ts
    pets/[id]/route.ts
  sign-in/page.tsx
  sign-up/page.tsx
  people/
  pets/
  _components/
    providers.tsx            ← QueryClient, UserNav, hydration, sync wiring

db/
  dexie/                     ← all IndexedDB files
    index.ts                 ← AppDB class (database: "AppDB_2")
    schema/
      schema-v3.ts           ← current schema (UUID PKs, sync fields)
      index.ts               ← single version, no migrations needed
  neon/                      ← all Postgres files
    index.ts                 ← Drizzle singleton
    schema.ts                ← people + pets tables
    auth-schema.ts           ← better-auth tables
    migrations/              ← committed SQL migration files

features/
  people/
    types.ts                 ← Person, NewPerson
    storage.ts               ← Dexie reads/writes + background server sync
    services.ts              ← TanStack Query hooks
    query-keys.ts
    schemas.ts               ← Zod form schema
    components/ui/
  pets/
    (same structure)

lib/
  auth.ts                    ← betterAuth() server instance
  auth-client.ts             ← createAuthClient() for client components
  hydrate.ts                 ← on-login: pull server → Dexie
  sync.ts                    ← flush pendingSync records to server

proxy.ts                     ← route protection (Next.js 16)
drizzle.config.ts
```

---

## Entity Shape

Every entity has a consistent set of fields:

```typescript
type Person = {
  id: string;              // UUID — generated client-side with crypto.randomUUID()
  userId?: string;         // better-auth user ID — set at creation time (optional in type for Omit compatibility)
  firstName: string;
  lastName: string;
  age: number;
  createdAt: number;       // Unix ms timestamp (Date.now())
  updatedAt: number;       // Unix ms timestamp — updated on every write
  pendingSync: boolean;    // true = not yet confirmed by server
  pendingDelete: boolean;  // true = deleted offline, awaiting server confirmation
};
```

The `New*` type omits the system-generated fields:

```typescript
type NewPerson = Omit<Person, "id" | "userId" | "createdAt" | "updatedAt" | "pendingSync" | "pendingDelete">;
```

---

## Two-Phase Sync

### Phase 1 — Write-Through (implemented)
- Writes go to Dexie immediately, then to the server in the background
- Offline writes are marked `pendingSync: true` and flushed by the sync service when online
- On login, Postgres data is pulled into Dexie (hydration)

### Phase 2 — Offline Queue (implemented)
- Offline deletes are soft-deleted (`pendingDelete: true`) until the server confirms
- Sync service runs on mount and on the `online` event
- `Promise.allSettled` ensures one failed sync doesn't block others

---

## Critical Configuration Details

These are non-obvious settings that must be correct for the architecture to work:

**TanStack Query `networkMode: "always"`**
Without this, TanStack Query pauses mutations when the browser reports offline. The mutation never fires, the Dexie write never happens, and the UI hangs forever in a "saving" state.

**Dexie database name `"AppDB_2"`**
Dexie cannot change a table's primary key type in a migration. When the schema changed from auto-increment integer IDs to UUID strings, the database was renamed to create a fresh instance. Data is recovered from Postgres on the next login via hydration.

**`drizzle.config.ts` must include both schema files**
`schema: ["./db/neon/schema.ts", "./db/neon/auth-schema.ts"]` — if only the app schema is included, migrations fail because `people.userId` references `user.id` which doesn't exist yet.

**`dotenv` in `drizzle.config.ts`**
`drizzle-kit` doesn't auto-load `.env.local`. Add `import { config } from "dotenv"; config({ path: ".env.local" })` at the top.

**Drizzle returns camelCase, timestamps as ISO strings**
When mapping server responses into Dexie, property names are already camelCase (matching the schema definition). Timestamps are ISO strings after `Response.json()` serialisation and must be converted: `new Date(p.createdAt).getTime()`.

---

## Further Reading

- [`docs/offline-sync.md`](./offline-sync.md) — detailed write-through pattern, sync service, hydration
- [`docs/auth.md`](./auth.md) — better-auth setup, route protection, session handling
- [`docs/database.md`](./database.md) — Drizzle schema, migration workflow, query patterns
- [`docs/dexie.md`](./dexie.md) — original Dexie-only setup (pre-sync, useful as a simpler starting point)
