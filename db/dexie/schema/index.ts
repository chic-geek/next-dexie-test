import type { Dexie } from "dexie";
import { schemaV3 } from "./schema-v3";

export function schema(db: Dexie) {
  db.version(1).stores(schemaV3);
}
