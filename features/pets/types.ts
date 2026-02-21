export type PetSpecies = "dog" | "cat" | "other";

export type Pet = {
  id: string; // UUID, generated client-side
  userId?: string; // better-auth user ID (set after login)
  name: string;
  species: PetSpecies;
  ownerPersonId: string | null; // UUID string reference to Person
  createdAt: number; // Unix ms timestamp
  updatedAt: number;
  pendingSync: boolean;
  pendingDelete: boolean;
};

export type NewPet = Omit<
  Pet,
  "id" | "userId" | "createdAt" | "updatedAt" | "pendingSync" | "pendingDelete"
>;
