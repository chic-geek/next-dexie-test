import { Dexie, type Table } from "dexie";
import { schema } from "./schema";
import { Person } from "@/features/people/types";

class AppDB extends Dexie {
  people!: Table<Person, number>;

  constructor() {
    super("AppDB");
    schema(this);
  }
}

export const db = new AppDB();
