# ADR 007: Soft-Delete Before Server Confirmation

**Status:** Accepted

## Context

When a user deletes a record, the app must remove it from the UI and eventually remove it from the server. The question is: what happens to the Dexie record while waiting for the server to confirm the deletion?

## Decision

Always mark the record as soft-deleted (`pendingDelete: true, pendingSync: true`) in Dexie first, before attempting the server request. Only hard-delete from Dexie after the server confirms with a 2xx or 404.

```typescript
await db.people.update(id, { pendingDelete: true, pendingSync: true });

if (navigator.onLine) {
  const res = await fetch(`/api/people/${id}`, { method: "DELETE" }).catch(() => null);
  if (res && (res.ok || res.status === 404)) {
    await db.people.delete(id);
  }
  // if the request failed, pendingDelete stays true — sync service retries on reconnect
}
```

List queries always filter `!pendingDelete`, so the record disappears from the UI immediately.

## Alternatives Considered

**Hard-delete from Dexie immediately, restore on server failure** — delete the record from Dexie optimistically, attempt the server request, and re-insert the record if the request fails. Rejected because: if the server request fails (network error, timeout), the local copy is already gone and cannot be restored without re-fetching from the server — which may also fail offline. The retry path is broken.

**Hard-delete from Dexie only after server confirms (blocking UX)** — keep the record visible until the server confirms deletion. Rejected because: this blocks the UI on a network round-trip, which contradicts the offline-first principle.

## Consequences

- The delete appears instant to the user (record disappears from the list immediately).
- The record is preserved in Dexie until the server confirms, so the sync service can always retry.
- A 404 from the server is treated as success for deletes — if the record never reached the server (created and deleted offline), there is nothing to delete server-side; cleaning up Dexie is the right outcome.
- Records in the `pendingDelete: true` state are invisible in the UI but visible in IndexedDB DevTools. This is expected and correct.
