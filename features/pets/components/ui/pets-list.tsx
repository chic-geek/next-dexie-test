"use client";

import * as React from "react";
import { useDeletePetMutation, usePetsQuery } from "../../services";
import { usePeopleQuery } from "@/features/people/services";
import { AlertButton } from "@/features/people/components/ui/alert-button";
import { EditIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PetsList() {
  const pets = usePetsQuery();
  const people = usePeopleQuery();
  const deletePet = useDeletePetMutation();

  const ownerNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of people.data ?? []) {
      m.set(p.id, `${p.firstName} ${p.lastName}`);
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
              <div className="flex items-top justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Species: {p.species}
                  </div>

                  {p.ownerPersonId != null ? (
                    <div className="text-sm text-muted-foreground">
                      Owner: {ownerName ?? "Unknown (deleted person)"}
                    </div>
                  ) : null}
                </div>

                <div className="text-right flex flex-col justify-between items-end gap-1">
                  <div>
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${p.name}'s details`}
                    >
                      <Link href={`/pets/${p.id}/edit`}>
                        <EditIcon className="size-4" />
                      </Link>
                    </Button>
                    <AlertButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${p.name}`}
                      onConfirm={() => deletePet.mutate(p.id)}
                    >
                      <TrashIcon size="16" color="red" />
                    </AlertButton>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
