import type { DB } from "../db";
import type { Migration } from "../modules/types";

/**
 * Spustí dosud neaplikované migrace ve vzestupném pořadí ID.
 * Každá migrace běží ve vlastní transakci; použité migrace se evidují v `schema_migrations`.
 */
export function runMigrations(db: DB, migrations: Migration[]): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const ids = new Set<number>();
  for (const m of migrations) {
    if (ids.has(m.id)) throw new Error(`Duplicitní ID migrace ${m.id} (${m.name})`);
    ids.add(m.id);
  }
  const applied = new Set((db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id));
  const ran: number[] = [];
  for (const m of [...migrations].sort((a, b) => a.id - b.id)) {
    if (applied.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      m.up(db);
      db.prepare("INSERT INTO schema_migrations(id, name) VALUES (?, ?)").run(m.id, m.name);
      db.exec("COMMIT");
      ran.push(m.id);
    } catch (e) {
      db.exec("ROLLBACK");
      throw new Error(`Migrace ${m.id} (${m.name}) selhala: ${(e as Error).message}`);
    }
  }
  return ran;
}
