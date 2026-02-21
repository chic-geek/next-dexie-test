import { db } from "@/db/dexie";
import type { Person } from "@/features/people/types";
import type { Pet } from "@/features/pets/types";

// Drizzle returns camelCase JS property names + Date objects serialised to ISO
// strings by Response.json()
type ServerPerson = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  age: number;
  createdAt: string; // ISO string after JSON serialisation
  updatedAt: string;
};

type ServerPet = {
  id: string;
  userId: string;
  ownerPersonId: string | null;
  name: string;
  species: "dog" | "cat" | "other";
  createdAt: string;
  updatedAt: string;
};

function serverPersonToDexie(p: ServerPerson): Person {
  return {
    id: p.id,
    userId: p.userId,
    firstName: p.firstName,
    lastName: p.lastName,
    age: p.age,
    createdAt: new Date(p.createdAt).getTime(),
    updatedAt: new Date(p.updatedAt).getTime(),
    pendingSync: false,
    pendingDelete: false,
  };
}

function serverPetToDexie(p: ServerPet): Pet {
  return {
    id: p.id,
    userId: p.userId,
    ownerPersonId: p.ownerPersonId,
    name: p.name,
    species: p.species,
    createdAt: new Date(p.createdAt).getTime(),
    updatedAt: new Date(p.updatedAt).getTime(),
    pendingSync: false,
    pendingDelete: false,
  };
}

export async function hydrateFromServer(userId: string): Promise<void> {
  // Key by userId so switching accounts in the same tab triggers a fresh hydration
  const HYDRATION_KEY = `hydratedAt:${userId}`;
  // Only hydrate once per browser session (sessionStorage is cleared on tab close)
  if (sessionStorage.getItem(HYDRATION_KEY)) return;

  const [peopleRes, petsRes] = await Promise.all([
    fetch("/api/people"),
    fetch("/api/pets"),
  ]);

  if (!peopleRes.ok || !petsRes.ok) return;

  const [serverPeople, serverPets]: [ServerPerson[], ServerPet[]] =
    await Promise.all([peopleRes.json(), petsRes.json()]);

  // Load all local records into maps for O(1) updatedAt comparison
  const [localPeople, localPets] = await Promise.all([
    db.people.toArray(),
    db.pets.toArray(),
  ]);
  const localPeopleMap = new Map(localPeople.map((p) => [p.id, p]));
  const localPetsMap = new Map(localPets.map((p) => [p.id, p]));

  await db.people.bulkPut(
    serverPeople
      .filter((p) => {
        const local = localPeopleMap.get(p.id);
        // Local edits always win — never overwrite pending changes
        if (local?.pendingSync) return false;
        // Record missing locally — pull it in
        if (!local) return true;
        // Server record is newer — take it; otherwise keep local version
        return new Date(p.updatedAt).getTime() > local.updatedAt;
      })
      .map(serverPersonToDexie)
  );

  await db.pets.bulkPut(
    serverPets
      .filter((p) => {
        const local = localPetsMap.get(p.id);
        if (local?.pendingSync) return false;
        if (!local) return true;
        return new Date(p.updatedAt).getTime() > local.updatedAt;
      })
      .map(serverPetToDexie)
  );

  sessionStorage.setItem(HYDRATION_KEY, Date.now().toString());
}
