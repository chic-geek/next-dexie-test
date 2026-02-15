import type { Dexie } from "dexie";
import { schemaV1 } from "./schema-v1";
import { schemaV2 } from "./schema-v2";

export function schema(db: Dexie) {
  // Initial schema
  db.version(1).stores(schemaV1);
  db.version(2).stores(schemaV2);
}
