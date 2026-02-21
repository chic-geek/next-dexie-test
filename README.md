# Offline-First Next.js Blueprint

A reference implementation for building offline-first Next.js applications backed by Postgres. Designed to be copied as the starting point for apps where offline use is a hard requirement — e.g. a workout tracker used in a gym without connectivity.

## What this project demonstrates

- **Offline-first reads and writes** — Dexie (IndexedDB) is the primary data store. The user never waits for a network round-trip.
- **Write-through sync** — writes go to Dexie immediately, then to Postgres in the background.
- **Offline write queue** — failed server writes are retried automatically when connectivity returns (`pendingSync` flag).
- **Soft deletes** — offline deletes are queued and replayed; the record is hidden from the UI but kept in Dexie until the server confirms.
- **On-login hydration** — when a user logs in on any device, their server data is pulled into Dexie so reads work immediately.
- **Multi-account safety** — all Dexie queries are scoped by `userId`; hydration and sync are keyed per user.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Local store | Dexie.js v4 (IndexedDB) |
| Server database | Neon Postgres (serverless HTTP driver) |
| ORM | Drizzle ORM |
| Auth | better-auth (email/password) |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + Zod |
| UI | shadcn/ui + Tailwind CSS v4 |

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database (free tier is sufficient)

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Create `.env.local`**

```bash
# Neon connection string — from your Neon project dashboard
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Random secret — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here

# Public URL of the app (used by better-auth for CSRF and callbacks)
BETTER_AUTH_URL=http://localhost:3000
```

**3. Run migrations**

```bash
npx drizzle-kit migrate
```

This applies the committed SQL migration files in `db/neon/migrations/` to your Neon database.

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to sign up on first visit.

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System overview, data flow, project structure, critical config |
| [`docs/offline-sync.md`](docs/offline-sync.md) | Write-through pattern, sync service, hydration, replication checklist |
| [`docs/auth.md`](docs/auth.md) | better-auth setup, route protection, session handling |
| [`docs/database.md`](docs/database.md) | Drizzle schema, migration workflow, query patterns |
| [`docs/dexie.md`](docs/dexie.md) | Dexie database class, schema versioning, query/write API |
| [`docs/adding-an-entity.md`](docs/adding-an-entity.md) | Step-by-step guide to adding a new entity to the sync architecture |

## Project structure

```
app/
  api/
    auth/[...all]/    ← better-auth catch-all
    people/           ← GET, POST
    people/[id]/      ← PATCH, PUT (upsert), DELETE
    pets/
    pets/[id]/
  sign-in/
  sign-up/
  _components/
    providers.tsx     ← QueryClient, hydration, sync wiring

db/
  dexie/              ← IndexedDB (client-side)
    index.ts          ← AppDB_2 class + singleton
    schema/           ← versioned schema definitions
  neon/               ← Postgres (server-side)
    index.ts          ← Drizzle singleton
    schema.ts         ← app tables
    auth-schema.ts    ← better-auth tables
    migrations/       ← committed SQL files

features/
  people/             ← types, storage, services, query-keys, components
  pets/

lib/
  auth.ts             ← betterAuth() server instance
  auth-client.ts      ← createAuthClient() for client components
  hydrate.ts          ← on-login: pull server data into Dexie
  sync.ts             ← flush pendingSync records to server

proxy.ts              ← route protection (Next.js 16)
drizzle.config.ts
```
