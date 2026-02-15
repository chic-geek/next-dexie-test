"use client";

import { useForm } from "react-hook-form";
import { useAddPetMutation } from "@/features/pets/services";
import { usePeopleQuery } from "@/features/people/services";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type FormValues = {
  name: string;
  species: "dog" | "cat" | "other";
  ownerPersonId?: number; // NEW
};

export function PetsForm() {
  const addPet = useAddPetMutation();
  const people = usePeopleQuery();

  const form = useForm<FormValues>({
    defaultValues: { name: "", species: "dog", ownerPersonId: undefined },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await addPet.mutateAsync({
      name: values.name.trim(),
      species: values.species,
      ownerPersonId: values.ownerPersonId,
    });

    form.reset({ name: "", species: "dog", ownerPersonId: undefined });
  });

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="font-medium">Add pet</h2>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet name</FormLabel>
                <FormControl>
                  <Input placeholder="Milo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="species"
            rules={{ required: "Species is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Species</FormLabel>
                <FormControl>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value as FormValues["species"])
                    }
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* NEW: Owner select */}
          <FormField
            control={form.control}
            name="ownerPersonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner (optional)</FormLabel>
                <FormControl>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? undefined : Number(v));
                    }}
                    disabled={people.isLoading || people.isError}
                  >
                    <option value="">No owner</option>
                    {people.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </FormControl>
                {/* Optional: show a hint if people failed to load */}
                {people.isError ? (
                  <p className="text-sm text-destructive">
                    Could not load people.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={addPet.isPending}>
            {addPet.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
