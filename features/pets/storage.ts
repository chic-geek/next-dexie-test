import { db } from "@/db";
import type { NewPet } from "./types";

export async function addPet(input: NewPet) {
  return db.pets.add({
    ...input,
    createdAt: Date.now(),
  });
}

export async function listPetsNewestFirst() {
  return db.pets.orderBy("createdAt").reverse().toArray();
}
