import { db } from "@/db/dexie";

// Flushes all Dexie records that have pendingSync: true to the server.
// Called on mount and whenever the browser comes back online.
// Uses Promise.allSettled so one failure doesn't block the rest.
export async function syncPendingChanges(): Promise<void> {
  const [pendingPeople, pendingPets] = await Promise.all([
    db.people.filter((p) => p.pendingSync).toArray(),
    db.pets.filter((p) => p.pendingSync).toArray(),
  ]);

  await Promise.allSettled(
    pendingPeople.map(async (person) => {
      if (person.pendingDelete) {
        const res = await fetch(`/api/people/${person.id}`, {
          method: "DELETE",
        });
        if (res.ok || res.status === 404) {
          await db.people.delete(person.id);
        }
      } else {
        const res = await fetch(`/api/people/${person.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(person),
        });
        if (res.ok) {
          await db.people.update(person.id, { pendingSync: false });
        }
      }
    })
  );

  await Promise.allSettled(
    pendingPets.map(async (pet) => {
      if (pet.pendingDelete) {
        const res = await fetch(`/api/pets/${pet.id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          await db.pets.delete(pet.id);
        }
      } else {
        const res = await fetch(`/api/pets/${pet.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pet),
        });
        if (res.ok) {
          await db.pets.update(pet.id, { pendingSync: false });
        }
      }
    })
  );
}
