import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DEFAULT_DB_DIR = path.join(process.cwd(), "data");
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, "db.sqlite");

export function createDbConnection(dbPath: string = DEFAULT_DB_PATH) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  return drizzle(sqlite, { schema });
}

export const db = createDbConnection();
