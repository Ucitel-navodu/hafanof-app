import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, "hafanof.sqlite");
export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
