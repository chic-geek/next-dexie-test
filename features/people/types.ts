export type Person = {
  id: string; // UUID, generated client-side
  userId?: string; // better-auth user ID (set after login)
  firstName: string;
  lastName: string;
  age: number;
  createdAt: number; // Unix ms timestamp
  updatedAt: number;
  pendingSync: boolean;
  pendingDelete: boolean;
};

export type NewPerson = Omit<
  Person,
  "id" | "userId" | "createdAt" | "updatedAt" | "pendingSync" | "pendingDelete"
>;
