import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DB } from "./db";

/**
 * Konzistentní záloha (sekce 1, 21): snapshot databáze přes VACUUM INTO
 * (bezpečné i za běhu) + kopie nahraných souborů.
 */
export function createBackup(db: DB, uploadsDir: string, backupsDir: string): { name: string; path: string } {
  const name = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(backupsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, "hafanof.sqlite");
  db.prepare("VACUUM INTO ?").run(target);
  if (fs.existsSync(uploadsDir)) fs.cpSync(uploadsDir, path.join(dir, "uploads"), { recursive: true });
  const check = new DatabaseSync(target, { readOnly: true });
  const ok = (check.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
  const dogs = (check.prepare("SELECT COUNT(*) AS n FROM dogs").get() as { n: number }).n;
  check.close();
  if (ok !== "ok") throw new Error("Záloha neprošla kontrolou integrity");
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ created_at: new Date().toISOString(), integrity: ok, dogs }, null, 2),
  );
  return { name, path: dir };
}

export function listBackups(backupsDir: string) {
  if (!fs.existsSync(backupsDir)) return [];
  return fs
    .readdirSync(backupsDir)
    .filter((n) => fs.existsSync(path.join(backupsDir, n, "manifest.json")))
    .sort()
    .reverse()
    .map((n) => ({ name: n, ...JSON.parse(fs.readFileSync(path.join(backupsDir, n, "manifest.json"), "utf8")) }));
}

/** Obnova ze zálohy — spouštět při zastaveném serveru (scripts/restore.ts). */
export function restoreBackup(backupDir: string, dataDir: string, uploadsDir: string) {
  const src = path.join(backupDir, "hafanof.sqlite");
  if (!fs.existsSync(src)) throw new Error(`V ${backupDir} chybí hafanof.sqlite`);
  fs.mkdirSync(dataDir, { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(path.join(dataDir, "hafanof.sqlite" + suffix), { force: true });
  fs.copyFileSync(src, path.join(dataDir, "hafanof.sqlite"));
  const up = path.join(backupDir, "uploads");
  fs.rmSync(uploadsDir, { recursive: true, force: true });
  if (fs.existsSync(up)) fs.cpSync(up, uploadsDir, { recursive: true });
  else fs.mkdirSync(uploadsDir, { recursive: true });
}
