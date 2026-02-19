"use client";

import { useState } from "react";
import { useAddPetMutation } from "../../services";
import { PetsForm } from "./pets-form";

export function PetsCreateForm() {
  const addPet = useAddPetMutation();
  const [formKey, setFormKey] = useState(0);

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="font-medium">Add pet</h2>
      <PetsForm
        key={formKey}
        isPending={addPet.isPending}
        showReset
        onSubmit={async (values) => {
          await addPet.mutateAsync(values);
          setFormKey((k) => k + 1);
        }}
      />
    </section>
  );
}
