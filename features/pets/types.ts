export type PetSpecies = "dog" | "cat" | "other";

export type Pet = {
  id?: number;
  name: string;
  species: PetSpecies;
  ownerPersonId?: number; // optional relationship to Person (not enforced)
  createdAt: number;
};

export type NewPet = Omit<Pet, "id" | "createdAt">;
