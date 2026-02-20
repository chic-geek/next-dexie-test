import { db } from "@/db/dexie";
import type { NewPerson, Person } from "./types";

function syncPerson(person: Person) {
  fetch("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(person),
  })
    .then(async (res) => {
      if (res.ok) await db.people.update(person.id, { pendingSync: false });
    })
    .catch(() => {
      /* request failed — pendingSync stays true, sync service will retry */
    });
}

function syncPersonUpdate(id: string, updates: object) {
  fetch(`/api/people/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
    .then(async (res) => {
      if (res.ok) await db.people.update(id, { pendingSync: false });
    })
    .catch(() => {
      /* request failed — pendingSync stays true, sync service will retry */
    });
}

function syncPersonDelete(id: string) {
  fetch(`/api/people/${id}`, { method: "DELETE" }).catch(() => {
    /* request failed */
  });
}

export async function addPerson(input: NewPerson): Promise<Person> {
  const person: Person = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingSync: true,
    pendingDelete: false,
  };
  await db.people.add(person);
  syncPerson(person);
  return person;
}

export async function listPeopleNewestFirst(userId: string): Promise<Person[]> {
  return db.people
    .orderBy("createdAt")
    .reverse()
    .filter((p) => p.userId === userId && !p.pendingDelete)
    .toArray();
}

export async function deletePerson(id: string): Promise<void> {
  if (navigator.onLine) {
    await db.people.delete(id);
    syncPersonDelete(id);
  } else {
    await db.people.update(id, { pendingDelete: true, pendingSync: true });
  }
}

export async function updatePerson(
  id: string,
  updates: Partial<NewPerson>
): Promise<void> {
  const updatedAt = Date.now();
  await db.people.update(id, { ...updates, updatedAt, pendingSync: true });
  syncPersonUpdate(id, { ...updates, updatedAt });
}
