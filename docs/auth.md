# Authentication with better-auth

This document covers the better-auth setup used in this project: email/password authentication, Next.js 16 integration, and session-based route protection.

---

## Stack

| Package | Role |
|---|---|
| `better-auth` | Auth library — handles sessions, hashing, email/password |
| `drizzle-orm` | ORM used as the better-auth database adapter |
| `@neondatabase/serverless` | Postgres driver (Neon) |

---

## File Structure

```
lib/
  auth.ts          ← betterAuth() server instance (server-only)
  auth-client.ts   ← createAuthClient() for client components

db/neon/
  auth-schema.ts   ← better-auth tables (user, session, account, verification)

app/api/auth/
  [...all]/
    route.ts       ← better-auth catch-all handler

app/
  sign-in/page.tsx
  sign-up/page.tsx

proxy.ts           ← route protection (Next.js 16)
```

---

## Server Instance (`lib/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/neon";
import * as authSchema from "@/db/neon/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],  // required for server components / route handlers
});
```

`nextCookies()` is required. Without it, `auth.api.getSession()` won't be able to read cookies in server components and route handlers.

---

## Client Instance (`lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const { signIn, signOut, signUp, useSession } = authClient;
```

Import these named exports in client components rather than importing `authClient` directly.

---

## Auth Tables (`db/neon/auth-schema.ts`)

better-auth requires four tables: `user`, `session`, `account`, `verification`. These can be generated with the better-auth CLI:

```bash
npx @better-auth/cli@latest generate
```

The generated file should be committed at `db/neon/auth-schema.ts`.

**Important:** `drizzle.config.ts` must include `auth-schema.ts` in its schema path alongside your app schema, otherwise the migration will fail with a foreign key error because `user` doesn't exist yet:

```typescript
schema: ["./db/neon/schema.ts", "./db/neon/auth-schema.ts"],
```

The `user` table is also imported in `db/neon/schema.ts` to define the `userId` foreign key on `people` and `pets`.

---

## Catch-All Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

All better-auth endpoints (`/api/auth/sign-in`, `/api/auth/sign-out`, etc.) are handled here automatically.

---

## Route Protection (`proxy.ts`)

Next.js 16 uses `proxy.ts` at the project root instead of `middleware.ts`. Route protection uses `getSessionCookie()` which only checks the cookie — no database round-trip on every request.

```typescript
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/sign-in", "/sign-up", "/api/auth"];

export function proxy(request: NextRequest) {
  const isPublic = PUBLIC.some((p) => request.nextUrl.pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const session = getSessionCookie(request);
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Reading the Session in API Routes

Use `auth.api.getSession()` for full session verification in route handlers. This makes a database call to validate the session token.

```typescript
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  // session.user.id is the authenticated user's ID
  const data = await db.select()
    .from(schema.people)
    .where(eq(schema.people.userId, session.user.id));

  return Response.json(data);
}
```

Never trust a `userId` sent from the client — always read it from `session.user.id`.

---

## Sign-In / Sign-Up Pages

Use `signIn.email()` and `signUp.email()` from the client instance. Both return a result object with an `error` property.

```typescript
const result = await signIn.email({ email, password });
if (result.error) {
  setError(result.error.message ?? "Sign in failed.");
} else {
  router.push("/");
}
```

---

## Sign-Out

Pass a callback via `fetchOptions.onSuccess` to redirect after the server confirms the session is cleared:

```typescript
signOut({
  fetchOptions: {
    onSuccess: () => router.push("/sign-in"),
  },
})
```

---

## Session in Client Components

```typescript
import { useSession } from "@/lib/auth-client";

function MyComponent() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return <p>{session.user.email}</p>;
}
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://...      # Neon connection string
BETTER_AUTH_SECRET=...             # Random secret: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000  # Public app URL (required)
```

`BETTER_AUTH_URL` is required — better-auth uses it to construct callback URLs and CSRF checks.

---

## Replication Checklist

- [ ] `npm install better-auth`
- [ ] Create `lib/auth.ts` with `betterAuth()`, `drizzleAdapter`, and `nextCookies()` plugin
- [ ] Create `lib/auth-client.ts` with `createAuthClient()`
- [ ] Run `npx @better-auth/cli@latest generate` → commit `db/neon/auth-schema.ts`
- [ ] Add `auth-schema.ts` to `drizzle.config.ts` schema array
- [ ] Run `npx drizzle-kit generate && npx drizzle-kit migrate`
- [ ] Create `app/api/auth/[...all]/route.ts` with `toNextJsHandler(auth)`
- [ ] Create `proxy.ts` with `getSessionCookie()` check
- [ ] Create sign-in and sign-up pages
- [ ] Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to `.env.local`
- [ ] Scope all data API routes to `session.user.id`
