# ADR 008: Neon Postgres with Serverless HTTP Driver

**Status:** Accepted

## Context

The app needs a durable server-side database. Next.js on Vercel (and other serverless platforms) runs in short-lived function invocations — traditional Postgres TCP connections are a poor fit because each invocation would need to establish and tear down a connection, and connection pools can't be maintained across cold starts.

## Decision

Use [Neon](https://neon.tech) Postgres with the `@neondatabase/serverless` HTTP driver (`drizzle-orm/neon-http`). Database queries are made over HTTP rather than persistent TCP connections.

## Alternatives Considered

**Traditional Postgres with TCP connection pooling (e.g. via PgBouncer)** — works well for always-on servers but problematic in serverless environments. Each function invocation competes for a limited pool, and cold starts incur TCP handshake latency. Neon itself provides connection pooling as a hosted service, but the HTTP driver sidesteps the problem entirely.

**Supabase** — managed Postgres with a REST API and realtime subscriptions. More opinionated (encourages using its own auth and client libraries), which would conflict with better-auth. Rejected to keep auth and database concerns decoupled.

**Firebase Realtime Database / Firestore** — NoSQL, serverless-native, built-in offline sync. Rejected because: vendor lock-in is significant; the query model is less flexible than SQL; and the existing Drizzle/SQL approach is more portable and familiar.

**PlanetScale** — serverless MySQL. Rejected in favour of Postgres (broader ecosystem, better Drizzle support, Neon's branching feature useful for dev/prod parity).

## Consequences

- No persistent TCP connections — cold starts are fast, no connection pool exhaustion.
- Neon's free tier is sufficient for development and small-scale production.
- The HTTP driver means each query is a separate HTTP request. For workloads with many small queries in a single request, this can add latency compared to a pooled TCP connection. Acceptable given the low query volume per API route in this app.
- Neon provides database branching (separate branch per PR) which is useful for preview deployments.
- `DATABASE_URL` uses the standard `postgresql://` format — switching to a different Postgres provider (e.g. Supabase, Railway) would require only a connection string change, not a code change.
