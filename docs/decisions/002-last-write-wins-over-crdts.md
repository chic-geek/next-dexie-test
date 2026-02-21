# ADR 002: Last-Write-Wins Over CRDTs

**Status:** Accepted

## Context

An offline-first app where the same user can write on multiple devices (or the same device across sessions) needs a conflict resolution strategy. When the user edits a record offline on Device A, then later on Device B, which version wins when they sync?

## Decision

Last-write-wins using `updatedAt` timestamps. The record with the higher `updatedAt` is treated as authoritative. No per-field merging.

During hydration, a three-way check is applied per record:
1. If `pendingSync: true` locally — local wins regardless of timestamps.
2. If missing locally — pull from server.
3. Otherwise — server wins only if its `updatedAt` is strictly newer.

## Alternatives Considered

**CRDTs (e.g. Automerge, Yjs)** — enable automatic per-field merging with no conflicts, designed for collaborative editing. Rejected because: this is single-user personal data; two concurrent authors cannot exist; the conflict problem CRDTs solve simply doesn't arise. The Ink & Switch team (who built Automerge) noted "conflicts were not as significant a problem as we feared" even in collaborative prototypes. Cinapse moved their scheduling app away from Automerge to server-authoritative sync and reported a 66% reduction in hosting costs and 89% fewer support issues.

**Operational Transformation (OT)** — similar rationale to CRDTs. Adds significant complexity for no benefit in a single-user context.

**Server always wins** — simple, but would silently discard offline edits made since last sync. Unacceptable for offline-first.

**Local always wins** — would prevent the server from ever correcting local state, breaking multi-device sync.

## Consequences

- Conflict resolution is simple to reason about and implement.
- In the unlikely edge case where the same record is edited on two devices before either syncs, the device that syncs last wins the entire record. No partial merge. Acceptable for personal data where the user is aware of what they're editing.
- If the use case ever becomes collaborative (multiple users editing shared records), this approach would need replacing with CRDTs or a server-authoritative merge strategy.
