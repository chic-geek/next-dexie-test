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

export async function deletePet(id: number) {
  return db.pets.delete(id);
}

export async function updatePet(id: number, input: Partial<NewPet>) {
  return db.pets.update(id, input);
}
