"use client";

import { useForm } from "react-hook-form";
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
import { useAddPersonMutation } from "../../services";

type FormValues = { firstName: string; lastName: string; age: number };

export function PeopleForm() {
  const addPerson = useAddPersonMutation();
  const form = useForm<FormValues>({
    defaultValues: { firstName: "", lastName: "", age: 0 },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await addPerson.mutateAsync({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      age: Number(values.age),
    });
    form.reset({ firstName: "", lastName: "", age: 0 });
  });

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="font-medium">Add person</h2>
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="firstName"
            rules={{ required: "First name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            rules={{ required: "Last name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="age"
            rules={{
              required: "Age is required",
              min: { value: 0, message: "Age must be >= 0" },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={addPerson.isPending}>
            {addPerson.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
