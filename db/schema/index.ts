import type { Dexie } from "dexie";
import { schemaV1 } from "./schema-v1";

export function schema(db: Dexie) {
  // Initial schema
  db.version(1).stores(schemaV1);
}
