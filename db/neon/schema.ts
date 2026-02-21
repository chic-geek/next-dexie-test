import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const people = pgTable("people", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  age: integer("age").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ownerPersonId: uuid("owner_person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  species: text("species", { enum: ["dog", "cat", "other"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
