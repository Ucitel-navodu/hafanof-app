import { Router } from "express";
import type { DB } from "../db";
import { requireLevel } from "../auth";
import { addDays } from "../audit";
import { h, str } from "./util";

type Row = Record<string, unknown>;

/** Historie změn (sekce 19) — jen čtení; zápis do auditu je append-only. */
export function auditRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "audit", "read");
      const where: string[] = [];
      const args: (string | number)[] = [];
      for (const k of ["user_id", "dog_id", "entity_id"] as const) {
        const v = str(req.query[k]);
        if (v) (where.push(`${k} = ?`), args.push(Number(v)));
      }
      const entity = str(req.query.entity);
      if (entity) (where.push("entity = ?"), args.push(entity));
      const from = str(req.query.from);
      if (from) (where.push("at >= ?"), args.push(from));
      const to = str(req.query.to);
      if (to) (where.push("at < ?"), args.push(addDays(to, 1)));
      const limit = Math.min(Number(req.query.limit) || 200, 1000);
      const offset = Number(req.query.offset) || 0;
      const rows = db
        .prepare(`SELECT * FROM audit_log ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ? OFFSET ?`)
        .all(...args, limit, offset) as Row[];
      res.json(rows.map((r) => ({ ...r, changes: JSON.parse(String(r.changes ?? "{}")) })));
    }),
  );
  return r;
}
