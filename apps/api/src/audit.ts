import type { DB } from "./db";
import type { AuthUser } from "./auth";
import { HttpError } from "./auth";
import { pragueNow } from "./time";

type Row = Record<string, unknown>;

/** Druhy auditních záznamů. Moduly používají i export/import/anonymize/security. */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "backup"
  | "restore"
  | "export"
  | "import"
  | "anonymize"
  | "security";
const HIDDEN = new Set(["password_hash"]);

function diff(before: Row | null, after: Row | null): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    if (HIDDEN.has(k) || k === "updated_at" || k === "created_at") continue;
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (a !== b) out[k] = [a, b];
  }
  return out;
}

/** Zapíše auditní záznam: kdo, kdy, co, původní a nová hodnota (sekce 19). */
export function audit(
  db: DB,
  user: AuthUser | undefined,
  action: AuditAction,
  entity: string,
  entityId: number | null,
  opts: { before?: Row | null; after?: Row | null; dogId?: number | null; extra?: Row } = {},
) {
  const changes = opts.extra ?? diff(opts.before ?? null, opts.after ?? null);
  if (action === "update" && Object.keys(changes).length === 0) return;
  db.prepare(
    "INSERT INTO audit_log(user_id, user_name, action, entity, entity_id, dog_id, changes) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(user?.id ?? null, user?.name ?? null, action, entity, entityId, opts.dogId ?? null, JSON.stringify(changes));
}

export function getRow(db: DB, table: string, id: number): Row {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
  if (!row) throw new HttpError(404, "Záznam nenalezen");
  return row;
}

type Value = string | number | null;

/** Pick only allowed keys, normalising booleans and empty strings. */
export function pick(body: Row, allowed: readonly string[]): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const k of allowed) {
    if (!(k in body)) continue;
    let v = body[k];
    if (typeof v === "boolean") v = v ? 1 : 0;
    if (v === "" || v === undefined) v = null;
    if (v !== null && typeof v !== "string" && typeof v !== "number") v = JSON.stringify(v);
    out[k] = v as Value;
  }
  return out;
}

export function insertRow(db: DB, table: string, data: Record<string, Value>): number {
  const keys = Object.keys(data);
  const sql = `INSERT INTO ${table}(${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  const r = db.prepare(sql).run(...keys.map((k) => data[k]));
  return Number(r.lastInsertRowid);
}

/** Insert + audit. */
export function createAudited(
  db: DB,
  user: AuthUser | undefined,
  table: string,
  data: Record<string, Value>,
  dogId?: number | null,
): Row {
  const id = insertRow(db, table, data);
  const after = getRow(db, table, id);
  audit(db, user, "create", table, id, { after, dogId: dogId ?? (after.dog_id as number | null) ?? null });
  return after;
}

/** Update + audit with old/new values. */
export function updateAudited(
  db: DB,
  user: AuthUser | undefined,
  table: string,
  id: number,
  patch: Record<string, Value>,
  dogId?: number | null,
): { before: Row; after: Row } {
  const before = getRow(db, table, id);
  const keys = Object.keys(patch);
  if (keys.length) {
    const hasUpdatedAt = "updated_at" in before;
    const sets = keys.map((k) => `${k} = ?`);
    if (hasUpdatedAt) sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`).run(...keys.map((k) => patch[k]), id);
  }
  const after = getRow(db, table, id);
  audit(db, user, "update", table, id, {
    before,
    after,
    dogId: dogId ?? (table === "dogs" ? id : ((after.dog_id as number | null) ?? null)),
  });
  return { before, after };
}

export function deleteAudited(db: DB, user: AuthUser | undefined, table: string, id: number, dogId?: number | null) {
  const before = getRow(db, table, id);
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  audit(db, user, "delete", table, id, { before, dogId: dogId ?? (before.dog_id as number | null) ?? null });
}

/** Přidá událost do časové osy psa (sekce 5). */
export function addDogEvent(
  db: DB,
  user: AuthUser | undefined,
  dogId: number,
  e: { date: string; type: string; title: string; note?: string | null; ref_type?: string; ref_id?: number },
) {
  insertRow(db, "dog_events", {
    dog_id: dogId,
    date: e.date,
    type: e.type,
    title: e.title,
    note: e.note ?? null,
    ref_type: e.ref_type ?? null,
    ref_id: e.ref_id ?? null,
    created_by: user?.id ?? null,
  });
}

/** Dnešní datum v Praze (ne UTC — jinak by po půlnoci SEČ byl „dnes“ ještě včerejšek). */
export const today = () => pragueNow().date;

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 864e5);
}

export function assertOneOf(value: unknown, allowed: readonly string[], field: string) {
  if (value === undefined || value === null) return;
  if (!allowed.includes(String(value))) throw new HttpError(400, `Neplatná hodnota pole ${field}`);
}

export function requireFields(body: Row, fields: string[]) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") throw new HttpError(400, `Chybí povinné pole: ${f}`);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function assertDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string" || !DATE_RE.test(value.slice(0, 10))) throw new HttpError(400, `Neplatné datum: ${field}`);
}
