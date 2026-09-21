import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Generating and checking migrations work offline. Applying them needs a URL.
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "" },
  strict: true,
  verbose: true,
});
