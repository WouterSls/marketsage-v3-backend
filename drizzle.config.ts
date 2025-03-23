import { Config, defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./js-build/src/lib/db/drizzle",
  dbCredentials: {
    url: "file:./data/db.sqlite",
  },
} satisfies Config);
