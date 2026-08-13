import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_DB_PATH = join(__dirname, "..", "data", "taskflow.sqlite");

const schemaPath = join(__dirname, "..", "db", "schema.sql");
const seedPath = join(__dirname, "..", "db", "seed.sql");

export function createDatabase(
  dbPath = process.env.DB_FILE || DEFAULT_DB_PATH,
  { seed = true } = {}
) {
  const isFileDatabase = dbPath !== ":memory:";
  const isNewFile = isFileDatabase && !existsSync(dbPath);

  if (isFileDatabase) {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(schemaPath, "utf8"));

  if (seed && (isNewFile || isDatabaseEmpty(db))) {
    seedDatabase(db);
  }

  return db;
}

export function isDatabaseEmpty(db) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM boards").get();
  return row.count === 0;
}

export function seedDatabase(db) {
  db.exec(readFileSync(seedPath, "utf8"));
}

export function resetAndSeedDatabase(db) {
  db.exec("DELETE FROM tasks");
  db.exec("DELETE FROM columns");
  db.exec("DELETE FROM boards");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'columns', 'boards')");
  seedDatabase(db);
}
