"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { petsFormSchema, PetsFormValues } from "../../schemas";

const speciesOptions = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "other", label: "Other" },
];

const emptyDefaults = {
  name: "",
  species: undefined,
  ownerPersonId: undefined,
};

type PetsFormProps = {
  isPending: boolean;
  defaultValues?: PetsFormValues;
  onSubmit: (values: PetsFormValues) => Promise<void>;
  showReset?: boolean;
};

export function PetsForm({
  isPending,
  defaultValues,
  onSubmit: onSubmitProp,
  showReset,
}: PetsFormProps) {
  const people = usePeopleQuery();

  const form = useForm({
    resolver: zodResolver(petsFormSchema),
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
          name="name"
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Species</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {speciesOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerPersonId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner (optional)</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v === "" ? null : v);
                }}
                disabled={people.isLoading || people.isError}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {people.data?.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.firstName} {option.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
