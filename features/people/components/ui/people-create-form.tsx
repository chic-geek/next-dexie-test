"use client";

import { useState } from "react";
import { useAddPersonMutation } from "../../services";
import { PeopleForm } from "./people-form";

export function PeopleCreateForm() {
  const addPerson = useAddPersonMutation();
  const [formKey, setFormKey] = useState(0);

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="font-medium">Add person</h2>
      <PeopleForm
        key={formKey}
        isPending={addPerson.isPending}
        showReset
        onSubmit={async (values) => {
          await addPerson.mutateAsync(values);
          setFormKey((k) => k + 1);
        }}
      />
    </section>
  );
}
