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


export async function addPerson(input: NewPerson, userId: string): Promise<Person> {
  const person: Person = {
    id: crypto.randomUUID(),
    ...input,
    userId,
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
  await db.people.update(id, { pendingDelete: true, pendingSync: true });

  if (navigator.onLine) {
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      await db.people.delete(id);
    }
    // if request failed, pendingDelete: true stays — sync service will retry on reconnect
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
