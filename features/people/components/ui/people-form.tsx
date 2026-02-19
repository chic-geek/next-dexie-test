"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { peopleFormSchema, PeopleFormValues } from "../../schemas";

const emptyDefaults: PeopleFormValues = { firstName: "", lastName: "", age: 0 };

type PeopleFormProps = {
  isPending: boolean;
  defaultValues?: PeopleFormValues;
  onSubmit: (values: PeopleFormValues) => Promise<void>;
  showReset?: boolean;
};

export function PeopleForm({
  isPending,
  defaultValues,
  onSubmit: onSubmitProp,
  showReset,
}: PeopleFormProps) {
  const form = useForm({
    resolver: zodResolver(peopleFormSchema),
    defaultValues: defaultValues ?? emptyDefaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await onSubmitProp(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input type="number" {...field} value={field.value as number} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          {showReset && (
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isPending}
            >
              Reset
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
