import { Dexie, type Table } from "dexie";
import { schema } from "./schema";
import { Person } from "@/features/people/types";
import { Pet } from "@/features/pets/types";

class AppDB extends Dexie {
  people!: Table<Person, number>;
  pets!: Table<Pet, number>;

  constructor() {
    super("AppDB");
    schema(this);
  }
}

export const db = new AppDB();
