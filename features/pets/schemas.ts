import { z } from "zod";

export const petsFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  species: z.enum(["dog", "cat", "other"], { error: "Species is required" }),
  ownerPersonId: z.number().optional(),
});

export type PetsFormValues = z.infer<typeof petsFormSchema>;
