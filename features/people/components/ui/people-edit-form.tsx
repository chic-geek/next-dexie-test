"use client";

import { useRouter } from "next/navigation";
import { usePeopleQuery, useUpdatePersonMutation } from "../../services";
import { PeopleForm } from "./people-form";

export function PeopleEditForm({ personId }: { personId: string }) {
  const router = useRouter();
  const people = usePeopleQuery();
  const updatePerson = useUpdatePersonMutation();

  const person = people.data?.find((p) => p.id === personId);

  if (people.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!person)
    return <p className="text-sm text-destructive">Person not found.</p>;

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <PeopleForm
        isPending={updatePerson.isPending}
        defaultValues={{
          firstName: person.firstName,
          lastName: person.lastName,
          age: person.age,
        }}
        onSubmit={async (values) => {
          await updatePerson.mutateAsync({
            id: personId,
            updates: values,
            fullname: `${values.firstName} ${values.lastName}`,
          });
          router.push("/people");
        }}
      />
    </section>
  );
}
