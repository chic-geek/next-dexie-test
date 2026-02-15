"use client";

import * as React from "react";
import { usePetsQuery } from "../../services";
import { usePeopleQuery } from "@/features/people/services";

export function PetsList() {
  const pets = usePetsQuery();
  const people = usePeopleQuery();

  const ownerNameById = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const p of people.data ?? []) {
      if (p.id != null) m.set(p.id, `${p.firstName} ${p.lastName}`);
    }
    return m;
  }, [people.data]);

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">Saved pets</h2>

      {pets.isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {pets.isError && (
        <p className="text-sm text-destructive">Failed to load pets.</p>
      )}

      <ul className="space-y-2">
        {pets.data?.map((p) => {
          const ownerName =
            p.ownerPersonId != null
              ? ownerNameById.get(p.ownerPersonId)
              : undefined;

          return (
            <li key={p.id} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Species: {p.species}
              </div>

              {p.ownerPersonId != null ? (
                <div className="text-sm text-muted-foreground">
                  Owner: {ownerName ?? "Unknown (deleted person)"}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
