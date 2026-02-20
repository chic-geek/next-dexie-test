import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

// Upsert — used by the sync service to flush offline writes.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [upserted] = await db
    .insert(schema.pets)
    .values({
      id,
      userId: session.user.id,
      name: body.name,
      species: body.species,
      ownerPersonId: body.ownerPersonId ?? null,
    })
    .onConflictDoUpdate({
      target: schema.pets.id,
      set: {
        name: body.name,
        species: body.species,
        ownerPersonId: body.ownerPersonId ?? null,
        updatedAt: new Date(),
      },
      setWhere: eq(schema.pets.userId, session.user.id),
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
    .update(schema.pets)
    .set({
      name: body.name,
      species: body.species,
      ownerPersonId: body.ownerPersonId ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.pets.id, id), eq(schema.pets.userId, session.user.id))
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
    .delete(schema.pets)
    .where(
      and(eq(schema.pets.id, id), eq(schema.pets.userId, session.user.id))
    );

  return new Response(null, { status: 204 });
}
