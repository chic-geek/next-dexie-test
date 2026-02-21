# ADR 006: `pendingSync` Flag Over TanStack Query Persisted Mutations

**Status:** Accepted

## Context

Phase 2 of the sync architecture requires offline writes to be queued and retried when connectivity returns. TanStack Query v5 has a built-in mechanism for this: persisted mutations (`PersistQueryClientProvider` + `setMutationDefaults`). An alternative is to manage the queue manually using flags on the entities themselves.

## Decision

Use a `pendingSync: boolean` field on every entity as the offline write queue. A separate sync service (`lib/sync.ts`) flushes pending records to the server on app mount and on the `window.online` event. TanStack Query is not involved in persistence or retry.

## Alternatives Considered

**TanStack Query persisted mutations** — mutations that fail while offline are serialised to storage and retried automatically when online. Rejected because:

- **Ordering problem**: if a record is created offline and then edited offline, two mutations are queued. TanStack Query can fire them out of order (a known issue with dependent offline mutations), causing the edit to arrive before the create and either fail or corrupt data.
- **Duplication of persistence**: Dexie is already a persistent store. Using TanStack Query's persistence layer would mean two separate persistence mechanisms in the same app.
- **Complexity**: persisted mutations require a storage adapter, serialisation of mutation arguments, and careful handling of mutation deduplication.

**`pendingSync` flag on entities** — the entity in Dexie is the queue entry. The sync service reads all records where `pendingSync: true` and replays them with a `PUT` upsert. No ordering problem because the entity's current state (not a log of operations) is what's synced: the latest edit always wins.

## Consequences

- The sync service uses `PUT` (upsert) rather than separate `POST`/`PATCH` endpoints — it doesn't need to know whether a record was created or updated offline.
- One missed mutation cannot cause ordering bugs because there are no queued operations — only current state.
- The queue survives page reloads naturally (Dexie persists across sessions).
- `Promise.allSettled` in the sync service ensures one failure doesn't block others.
- If an entity has multiple changes while offline, only the final state is synced. Intermediate states are not preserved. For personal data, this is acceptable.
