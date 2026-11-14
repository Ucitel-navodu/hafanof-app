import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, type DB } from "./db";
import { runMigrations } from "./migrations/runner";
import { allMigrations } from "./modules";

/** Otevře (a případně vytvoří) databázi a doběhne všechny migrace všech modulů. */
export function openDb(dataDir: string): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "hafanof.sqlite"));
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  runMigrations(db, allMigrations());
  const ins = db.prepare("INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, v);
  return db;
}
