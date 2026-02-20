import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

// Upsert — used by the sync service to flush offline writes.
// Uses INSERT ... ON CONFLICT DO UPDATE so it works whether the record
// already exists on the server or was created entirely offline.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [upserted] = await db
    .insert(schema.people)
    .values({
      id,
      userId: session.user.id,
      firstName: body.firstName,
      lastName: body.lastName,
      age: body.age,
    })
    .onConflictDoUpdate({
      target: schema.people.id,
      set: {
        firstName: body.firstName,
        lastName: body.lastName,
        age: body.age,
        updatedAt: new Date(),
      },
      setWhere: eq(schema.people.userId, session.user.id),
    })
    .returning();

  if (!upserted) return new Response("Conflict", { status: 409 });

  return Response.json(upserted);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(schema.people)
    .set({
      firstName: body.firstName,
      lastName: body.lastName,
      age: body.age,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.people.id, id),
        eq(schema.people.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) return new Response("Not found", { status: 404 });

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  await db
    .delete(schema.people)
    .where(
      and(
        eq(schema.people.id, id),
        eq(schema.people.userId, session.user.id)
      )
    );

  return new Response(null, { status: 204 });
}
