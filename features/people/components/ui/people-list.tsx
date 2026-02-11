"use client";

import { usePeopleQuery } from "../../services";

export function PeopleList() {
  const people = usePeopleQuery();

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">Saved people</h2>
      {people.isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {people.isError && (
        <p className="text-sm text-destructive">Failed to load people.</p>
      )}

      <ul className="space-y-2">
        {people.data?.map((p) => (
          <li
            key={p.id}
            className="rounded-md border p-3 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">
                {p.firstName} {p.lastName}
              </div>
              <div className="text-sm text-muted-foreground">Age: {p.age}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
