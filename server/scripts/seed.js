import { createDatabase, DEFAULT_DB_PATH, resetAndSeedDatabase } from "../src/database.js";

const dbPath = process.env.DB_FILE || DEFAULT_DB_PATH;
const db = createDatabase(dbPath, { seed: false });

resetAndSeedDatabase(db);
db.close();

console.info(`Seeded TaskFlow database at ${dbPath}`);
