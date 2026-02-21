import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  out: "./db/neon/migrations",
  schema: ["./db/neon/schema.ts", "./db/neon/auth-schema.ts"],
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
