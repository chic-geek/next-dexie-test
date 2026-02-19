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

type FormValues = { firstName: string; lastName: string; age: number };

const emptyDefaults: FormValues = { firstName: "", lastName: "", age: 0 };

type PeopleFormProps = {
  isPending: boolean;
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  showReset?: boolean;
};

export function PeopleForm({
  isPending,
  defaultValues,
  onSubmit: onSubmitProp,
  showReset,
}: PeopleFormProps) {
  const form = useForm<FormValues>({
    defaultValues: defaultValues ?? emptyDefaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await onSubmitProp({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      age: Number(values.age),
    });
  });

  return (
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
