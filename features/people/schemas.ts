import { z } from "zod";

export const peopleFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  age: z.coerce
    .number({ error: "Age is required" })
    .gte(0, "Age must be >= 0"),
});

export type PeopleFormValues = z.infer<typeof peopleFormSchema>;
