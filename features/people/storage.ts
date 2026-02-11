import { db } from "@/db";
import type { NewPerson } from "./types";

export async function addPerson(input: NewPerson) {
  return db.people.add({
    ...input,
    createdAt: Date.now(),
  });
}

export async function listPeopleNewestFirst() {
  return db.people.orderBy("createdAt").reverse().toArray();
}
