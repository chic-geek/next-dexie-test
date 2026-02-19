"use client";

import { useRouter } from "next/navigation";
import { usePetsQuery, useUpdatePetMutation } from "../../services";
import { PetsForm } from "./pets-form";

export function PetsEditForm({ petId }: { petId: number }) {
  const router = useRouter();
  const pets = usePetsQuery();
  const updatePet = useUpdatePetMutation();

  const pet = pets.data?.find((p) => p.id === petId);

  if (pets.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!pet)
    return <p className="text-sm text-destructive">Pet not found.</p>;

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <PetsForm
        isPending={updatePet.isPending}
        defaultValues={{
          name: pet.name,
          species: pet.species,
          ownerPersonId: pet.ownerPersonId,
        }}
        onSubmit={async (values) => {
          await updatePet.mutateAsync({
            id: petId,
            updates: values,
            name: pet.name,
          });
          router.push("/pets");
        }}
      />
    </section>
  );
}
