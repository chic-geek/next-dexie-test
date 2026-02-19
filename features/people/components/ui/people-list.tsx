"use client";

import { useDeletePersonMutation, usePeopleQuery } from "../../services";
import { EditIcon, TrashIcon } from "lucide-react";
import { AlertButton } from "./alert-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PeopleList() {
  const people = usePeopleQuery();
  const deletePerson = useDeletePersonMutation();

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
            <div className="">
              <Button
                asChild
                size="icon"
                variant="ghost"
                aria-label={`Edit ${p.firstName} ${p.lastName}`}
              >
                <Link href={`/people/${p.id}/edit`}>
                  <EditIcon className="size-4" />
                </Link>
              </Button>
              <AlertButton
                variant="ghost"
                size="icon"
                aria-label="Delete person"
                onConfirm={() => deletePerson.mutate(p.id!)}
              >
                <TrashIcon size="16" color="red" />
              </AlertButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
