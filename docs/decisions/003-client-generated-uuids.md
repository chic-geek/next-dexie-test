# ADR 003: Client-Generated UUIDs as Primary Keys

**Status:** Accepted

## Context

In an offline-first app, records are created in Dexie before they reach the server. If the server generates IDs (e.g. auto-increment integers), a record created offline has no server ID yet — requiring a mapping table between local IDs and server IDs, and complex resolution when the server ID is eventually assigned.

## Decision

IDs are generated client-side using `crypto.randomUUID()` before any write — to Dexie or the server. The same UUID is used as the primary key in both Dexie and Postgres. No mapping table exists.

## Alternatives Considered

**Server-generated auto-increment integers** — simple and familiar, but incompatible with offline creation. A record created offline has no server ID until it syncs, requiring either a temporary local ID (and a mapping table) or blocking creation until online.

**Server-generated UUIDs with client-side mapping** — server retains control of IDs, but adds a mapping layer: every local→server sync must resolve the temporary local ID to the real server ID, and all foreign key references must be updated. Significant complexity for no benefit.

**`crypto.randomUUID()`** — available in all modern browsers, cryptographically random, collision probability negligible. No server round-trip needed.

## Consequences

- Records created entirely offline can be synced with their correct ID. The upsert (`INSERT ... ON CONFLICT DO UPDATE`) just works — same UUID everywhere.
- **Dexie database renamed to `"AppDB_2"`**: the original database (`"AppDB"`) used auto-increment integer IDs (`++id`). Dexie cannot change a table's primary key type via a migration — it requires a fresh database instance. Renaming to `"AppDB_2"` achieves this. Data from the old database is not migrated; the server is the source of truth and data is recovered via hydration on next login.
- `crypto.randomUUID()` requires a secure context (HTTPS or localhost). Not available in very old browsers, but this is not a concern for the target platforms.
