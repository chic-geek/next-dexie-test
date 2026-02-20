import { db } from "@/db/dexie";
import type { NewPet, Pet } from "./types";

function syncPet(pet: Pet) {
  fetch("/api/pets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pet),
  })
    .then(async (res) => {
      if (res.ok) await db.pets.update(pet.id, { pendingSync: false });
    })
    .catch(() => {
      /* request failed — pendingSync stays true, sync service will retry */
    });
}

function syncPetUpdate(id: string, updates: object) {
  fetch(`/api/pets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
    .then(async (res) => {
      if (res.ok) await db.pets.update(id, { pendingSync: false });
    })
    .catch(() => {
      /* request failed — pendingSync stays true, sync service will retry */
    });
}


export async function addPet(input: NewPet, userId: string): Promise<Pet> {
  const pet: Pet = {
    id: crypto.randomUUID(),
    ...input,
    userId,
    ownerPersonId: input.ownerPersonId ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingSync: true,
    pendingDelete: false,
  };
  await db.pets.add(pet);
  syncPet(pet);
  return pet;
}

export async function listPetsNewestFirst(userId: string): Promise<Pet[]> {
  return db.pets
    .orderBy("createdAt")
    .reverse()
    .filter((p) => p.userId === userId && !p.pendingDelete)
    .toArray();
}

export async function deletePet(id: string): Promise<void> {
  await db.pets.update(id, { pendingDelete: true, pendingSync: true });

  if (navigator.onLine) {
    const res = await fetch(`/api/pets/${id}`, { method: "DELETE" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      await db.pets.delete(id);
    }
    // if request failed, pendingDelete: true stays — sync service will retry on reconnect
  }
}

export async function updatePet(
  id: string,
  input: Partial<NewPet>
): Promise<void> {
  const updatedAt = Date.now();
  await db.pets.update(id, { ...input, updatedAt, pendingSync: true });
  syncPetUpdate(id, { ...input, updatedAt });
}
