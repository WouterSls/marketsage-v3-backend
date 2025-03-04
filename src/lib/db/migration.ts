import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDbConnection } from "./db";
import path from "path";
import fs from "fs";

const MIGRATIONS_DIR = path.join(__dirname, "drizzle");

export async function runMigrations(dbPath?: string) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("Creating migrations directory...");
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const db = createDbConnection(dbPath);
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
