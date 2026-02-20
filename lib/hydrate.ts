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

const HYDRATION_KEY = "hydratedAt";

export async function hydrateFromServer(): Promise<void> {
  // Only hydrate once per browser session (sessionStorage is cleared on tab close)
  if (sessionStorage.getItem(HYDRATION_KEY)) return;

  const [peopleRes, petsRes] = await Promise.all([
    fetch("/api/people"),
    fetch("/api/pets"),
  ]);

  if (!peopleRes.ok || !petsRes.ok) return;

  const [serverPeople, serverPets]: [ServerPerson[], ServerPet[]] =
    await Promise.all([peopleRes.json(), petsRes.json()]);

  // Skip records that have unsync'd local edits
  const pendingPeople = await db.people
    .filter((p) => p.pendingSync)
    .primaryKeys();
  const pendingPets = await db.pets.filter((p) => p.pendingSync).primaryKeys();
  const pendingPeopleIds = new Set(pendingPeople as string[]);
  const pendingPetsIds = new Set(pendingPets as string[]);

  await db.people.bulkPut(
    serverPeople
      .filter((p) => !pendingPeopleIds.has(p.id))
      .map(serverPersonToDexie)
  );

  await db.pets.bulkPut(
    serverPets
      .filter((p) => !pendingPetsIds.has(p.id))
      .map(serverPetToDexie)
  );

  sessionStorage.setItem(HYDRATION_KEY, Date.now().toString());
}
