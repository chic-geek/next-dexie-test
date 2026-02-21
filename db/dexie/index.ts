import { Dexie, type Table } from "dexie";
import { schema } from "./schema";
import { Person } from "@/features/people/types";
import { Pet } from "@/features/pets/types";

class AppDB extends Dexie {
  people!: Table<Person, string>;
  pets!: Table<Pet, string>;

  constructor() {
    super("AppDB_2");
    schema(this);
  }
}

export const db = new AppDB();
