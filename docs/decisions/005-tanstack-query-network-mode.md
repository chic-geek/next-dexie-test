# ADR 005: TanStack Query `networkMode: "always"`

**Status:** Accepted

## Context

TanStack Query v5 has a `networkMode` setting that controls whether queries and mutations execute when the browser reports offline (via `navigator.onLine`). The default is `"online"`, which pauses queries and mutations when the browser is offline.

## Decision

Set `networkMode: "always"` globally on the `QueryClient` for both queries and mutations.

```typescript
new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always" },
    mutations: { networkMode: "always" },
  },
})
```

## Alternatives Considered

**Default `networkMode: "online"`** — TanStack Query pauses mutations when `navigator.onLine` is false. This is fatal for this architecture: when the user goes offline (including when Chrome DevTools network throttling is set to "Offline"), the mutation never fires, the Dexie write never happens, and the UI hangs forever in a "saving" state. The mutation is queued by TanStack Query but never executed because it's waiting for connectivity — even though the Dexie write doesn't need connectivity at all.

**Per-mutation override** — set `networkMode: "always"` on each individual mutation definition. Correct but easy to forget when adding new mutations, and inconsistent if missed.

## Consequences

- TanStack Query executes queries and mutations regardless of `navigator.onLine`. All offline logic is owned exclusively by the storage layer (Dexie + `pendingSync`), not by TanStack Query.
- TanStack Query will no longer automatically retry failed queries when coming back online based on network status. This is acceptable because Dexie reads never fail due to network conditions — they're local.
- The setting must be applied to the `QueryClient` instance in `providers.tsx`. If a second `QueryClient` is ever created (e.g. for testing), it must also have this configuration.
