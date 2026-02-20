import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/neon";
import * as schema from "@/db/neon/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const people = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.userId, session.user.id))
    .orderBy(desc(schema.people.createdAt));

  return Response.json(people);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const [person] = await db
    .insert(schema.people)
    .values({
      id: body.id,
      userId: session.user.id,
      firstName: body.firstName,
      lastName: body.lastName,
      age: body.age,
    })
    .returning();

  return Response.json(person, { status: 201 });
}
