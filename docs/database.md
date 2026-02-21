# Database: Drizzle ORM + Neon Postgres

This document covers the Postgres layer: Drizzle ORM, the Neon serverless driver, schema design, and the migration workflow.

---

## Stack

| Package | Role |
|---|---|
| `drizzle-orm` | TypeScript-first ORM |
| `drizzle-kit` (dev) | Schema migration CLI |
| `@neondatabase/serverless` | Neon's HTTP driver for serverless environments |

The Neon HTTP driver is the right choice for Next.js serverless deployments. It uses HTTP rather than persistent TCP connections, which is compatible with Vercel and other serverless environments where long-lived connections aren't possible.

---

## File Structure

```
db/neon/
  index.ts          ← Drizzle singleton
  schema.ts         ← app tables (people, pets)
  auth-schema.ts    ← better-auth tables (user, session, account, verification)
  migrations/       ← generated SQL files (committed to source control)

drizzle.config.ts   ← points drizzle-kit at the schema and database
```

---

## Drizzle Singleton (`db/neon/index.ts`)

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

Import `db` in route handlers. Never import this in client components — it would expose the database connection string.

---

## Schema (`db/neon/schema.ts`)

```typescript
import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const people = pgTable("people", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ownerPersonId: uuid("owner_person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  species: text("species", { enum: ["dog", "cat", "other"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Schema design decisions

| Decision | Choice | Reason |
|---|---|---|
| Primary key | `uuid` (client-generated) | Same ID in Dexie and Postgres — no mapping table needed |
| `userId` FK | `onDelete: "cascade"` | Deleting a user removes all their data |
| `ownerPersonId` FK | `onDelete: "set null"` | Deleting a person nulls the pet's owner rather than cascading |
| Timestamps | `timestamp().defaultNow()` | Server-side default; ISO strings parse cleanly client-side |
| Enums | Inline `text` enum | Simpler than a separate Postgres enum type |

---

## Drizzle Config (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });  // drizzle-kit doesn't auto-load .env.local

export default defineConfig({
  out: "./db/neon/migrations",
  schema: ["./db/neon/schema.ts", "./db/neon/auth-schema.ts"],
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Both schema files must be listed.** If only `schema.ts` is included, the migration will fail with a foreign key error because the `user` table (from `auth-schema.ts`) won't exist when `people` and `pets` try to reference it.

**`dotenv` is required.** `drizzle-kit` doesn't automatically load `.env.local`. Import `dotenv` at the top of the config to make `DATABASE_URL` available.

---

## Migration Workflow

```bash
# Generate SQL from schema changes
npx drizzle-kit generate

# Apply migrations to the database
npx drizzle-kit migrate
```

Generated SQL files are stored in `db/neon/migrations/` and should be committed to source control. They are the source of truth for what has been applied to the database.

To reset (development only):
```bash
rm -rf db/neon/migrations
npx drizzle-kit generate && npx drizzle-kit migrate
```

---

## Common Query Patterns

### Select with user scoping

```typescript
import { eq, desc } from "drizzle-orm";

const people = await db
  .select()
  .from(schema.people)
  .where(eq(schema.people.userId, session.user.id))
  .orderBy(desc(schema.people.createdAt));
```

### Insert

```typescript
const [person] = await db
  .insert(schema.people)
  .values({
    id: body.id,              // client-generated UUID
    userId: session.user.id,  // always from session, never from client
    firstName: body.firstName,
    lastName: body.lastName,
    age: body.age,
  })
  .returning();
```

### Update (scoped to user)

```typescript
const [updated] = await db
  .update(schema.people)
  .set({ firstName: body.firstName, updatedAt: new Date() })
  .where(
    and(
      eq(schema.people.id, id),
      eq(schema.people.userId, session.user.id)  // prevents updating other users' data
    )
  )
  .returning();
```

### Upsert (used by sync service)

```typescript
const [upserted] = await db
  .insert(schema.people)
  .values({ id, userId: session.user.id, ...body })
  .onConflictDoUpdate({
    target: schema.people.id,
    set: { ...body, updatedAt: new Date() },
    // Ownership guard: only update the conflicting row if it belongs to this user.
    // Without this, a conflicting UUID owned by another user would be silently overwritten.
    setWhere: eq(schema.people.userId, session.user.id),
  })
  .returning();

// If setWhere blocked the update, upserted is undefined. Return 409 so the
// sync service keeps pendingSync: true instead of treating it as a success.
if (!upserted) return new Response("Conflict", { status: 409 });
```

### Delete (scoped to user)

```typescript
await db
  .delete(schema.people)
  .where(
    and(
      eq(schema.people.id, id),
      eq(schema.people.userId, session.user.id)
    )
  );
```

---

## Drizzle Return Types and Serialisation

Drizzle maps Postgres column names to the **JavaScript property names defined in the schema**, not the SQL column names:

| Postgres column | Drizzle JS property |
|---|---|
| `first_name` | `firstName` |
| `user_id` | `userId` |
| `created_at` | `createdAt` |

Timestamp columns are returned as JavaScript `Date` objects. When serialised via `Response.json()`, they become ISO 8601 strings (`"2024-01-01T00:00:00.000Z"`).

When mapping server responses back to Dexie (which stores timestamps as Unix milliseconds), convert explicitly:

```typescript
createdAt: new Date(p.createdAt).getTime(),
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Get the connection string from the Neon dashboard: your project → Connection details. Use the **pooled** connection string for production (better concurrency with serverless).

---

## Replication Checklist

- [ ] `npm install drizzle-orm @neondatabase/serverless`
- [ ] `npm install -D drizzle-kit`
- [ ] Create `db/neon/index.ts` with Drizzle + Neon HTTP singleton
- [ ] Create `db/neon/schema.ts` with app tables (UUID PKs, `userId` FK, timestamps)
- [ ] Generate better-auth schema: `npx @better-auth/cli@latest generate` → `db/neon/auth-schema.ts`
- [ ] Create `drizzle.config.ts` with `dotenv` + both schema files
- [ ] Add `DATABASE_URL` to `.env.local`
- [ ] Run `npx drizzle-kit generate && npx drizzle-kit migrate`
- [ ] Always scope queries with `eq(table.userId, session.user.id)`
- [ ] Use `and()` for combined WHERE conditions
- [ ] Convert ISO timestamp strings to Unix ms when writing into Dexie
