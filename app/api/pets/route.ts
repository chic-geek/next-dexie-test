import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const pets = await db
    .select()
    .from(schema.pets)
    .where(eq(schema.pets.userId, session.user.id))
    .orderBy(desc(schema.pets.createdAt));

  return Response.json(pets);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const [pet] = await db
    .insert(schema.pets)
    .values({
      id: body.id,
      userId: session.user.id,
      name: body.name,
      species: body.species,
      ownerPersonId: body.ownerPersonId ?? null,
    })
    .returning();

  return Response.json(pet, { status: 201 });
}
