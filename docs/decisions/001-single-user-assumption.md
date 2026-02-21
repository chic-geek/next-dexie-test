# ADR 001: Single-User Assumption

**Status:** Accepted

## Context

The target use case is a personal offline-first app — one user per device (e.g. a workout tracker used at the gym). The question arose whether the architecture should defend against multiple users logging in and out on the same device: clearing Dexie on logout, supporting offline logout, etc.

## Decision

The app assumes a single user per device. No cleanup of Dexie data is performed on logout, and offline logout is not supported.

## Alternatives Considered

**Clear all Dexie tables on logout** — protects against User A's data lingering after they sign out on a shared device. Rejected because: the target use case has no shared devices; and if the user is offline when they log out, `signOut()` fails silently (it requires a server round-trip to invalidate the session), so the Dexie clear in `onSuccess` would never fire anyway.

**Support offline logout** — clear the session cookie client-side without server confirmation, wipe Dexie, redirect. Rejected because: the session remains valid on the server until confirmed invalidated, and the complexity is not justified for the target use case.

## Consequences

- User A's Dexie records remain in IndexedDB after logout. They are invisible through the app (all queries are scoped by `userId`) but are visible in browser DevTools.
- If you log out while offline the sign-out button silently fails and the user stays logged in. This is acceptable — the app is designed for offline use, and an offline user should remain in session.
- If this blueprint is ever adapted for a shared-device or multi-user context, logout cleanup and offline logout support would need to be added.
