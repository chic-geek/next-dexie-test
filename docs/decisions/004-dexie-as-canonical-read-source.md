# ADR 004: Dexie as the Canonical Read Source

**Status:** Accepted

## Context

With both a local store (Dexie) and a server database (Postgres), every read operation has a choice: go to Dexie, go to the server, or try the server and fall back to Dexie. The choice has major implications for offline behaviour and perceived performance.

## Decision

All reads always come from Dexie. The server is never queried for reads during a session. Postgres is the durable backup, not the read source.

Dexie is populated with server data on login (hydration) and kept up to date by the write-through pattern. After that, Dexie is always fresh enough.

## Alternatives Considered

**Server-first with Dexie fallback** — read from the server when online, fall back to Dexie when offline. Rejected because: every read incurs a network round-trip when online (slow, especially on mobile); the offline fallback introduces two code paths; and the definition of "online" is unreliable (the browser may report online but the server may be unreachable).

**Server-only reads** — no local store for reads. Simple, but the app is completely unusable offline. Unacceptable for the gym use case.

**Stale-while-revalidate** — serve Dexie immediately, then refresh from the server in the background and update the UI. More complexity for marginal benefit — Dexie is already up to date from write-through and hydration.

## Consequences

- Reads are always instant — no network latency, no loading spinners for list views.
- The app works fully offline for reads with no code-path differences.
- Dexie must be kept current: hydration on login, write-through on every mutation, and conflict resolution during hydration. If these are implemented incorrectly, Dexie can serve stale data. See `docs/offline-sync.md` for the correct patterns.
- TanStack Query must be configured with `networkMode: "always"` (see ADR 005) to avoid pausing reads when the browser reports offline.
