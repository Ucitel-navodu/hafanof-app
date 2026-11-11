import { Router } from "express";
import type { DB } from "../db";
import { PERSON_ROLES, tx } from "../db";
import { HttpError, requireLevel } from "../auth";
import { assertDate, createAudited, getRow, pick, requireFields, today, updateAudited } from "../audit";
import { h, intParam, optInt, str } from "./util";

const PERSON_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "email",
  "address",
  "roles",
  "foster_capacity",
  "foster_availability",
  "foster_limits",
  "gdpr_consent_at",
  "notes",
] as const;

type Row = Record<string, unknown>;

function normaliseRoles(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : typeof v === "string" ? JSON.parse(v) : [];
  for (const r of arr) if (!PERSON_ROLES.includes(r)) throw new HttpError(400, `Neznámá role osoby: ${r}`);
  return JSON.stringify([...new Set(arr)]);
}

export const parsePerson = (p: Row) => ({ ...p, roles: JSON.parse(String(p.roles ?? "[]")) });

/** Přidá osobě roli (např. adoptující po adopci), pokud ji ještě nemá. */
export function ensurePersonRole(db: DB, user: Express.Request["user"], personId: number, role: string) {
  const p = getRow(db, "people", personId);
  const roles = JSON.parse(String(p.roles)) as string[];
  if (!roles.includes(role)) updateAudited(db, user, "people", personId, { roles: JSON.stringify([...roles, role]) });
}

export function peopleRoutes(db: DB) {
  const r = Router();

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "people", "read");
      const where: string[] = [];
      const args: string[] = [];
      const q = str(req.query.q);
      if (q) {
        where.push(
          "(first_name || ' ' || last_name LIKE ? OR last_name || ' ' || first_name LIKE ? OR phone LIKE ? OR replace(phone,' ','') LIKE ? OR email LIKE ?)",
        );
        args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q.replace(/\s/g, "")}%`, `%${q}%`);
      }
      const role = str(req.query.role);
      if (role) {
        where.push("EXISTS (SELECT 1 FROM json_each(people.roles) WHERE value = ?)");
        args.push(role);
      }
      const rows = db
        .prepare(
          `SELECT people.*,
            (SELECT COUNT(*) FROM placements pl WHERE pl.person_id = people.id AND pl.end_date IS NULL) AS active_placements
           FROM people ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY last_name, first_name`,
        )
        .all(...args) as Row[];
      res.json(rows.map(parsePerson));
    }),
  );

  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "people", "write");
      requireFields(req.body, ["first_name"]);
      assertDate(req.body.gdpr_consent_at, "gdpr_consent_at");
      const data = pick(req.body, PERSON_FIELDS);
      data.roles = normaliseRoles(req.body.roles) ?? "[]";
      data.last_name = data.last_name ?? "";
      res.status(201).json(parsePerson(createAudited(db, req.user, "people", data)));
    }),
  );

  r.get(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "people", "read");
      const p = parsePerson(getRow(db, "people", id));
      // Vazby osoby na psy (sekce 8).
      const placements = db
        .prepare(
          `SELECT pl.*, d.name AS dog_name, d.reg_number FROM placements pl JOIN dogs d ON d.id = pl.dog_id
           WHERE pl.person_id = ? ORDER BY pl.start_date DESC`,
        )
        .all(id);
      const adoptions = db
        .prepare(
          `SELECT a.*, d.name AS dog_name, d.reg_number FROM adoptions a JOIN dogs d ON d.id = a.dog_id
           WHERE a.person_id = ? ORDER BY a.applied_at DESC`,
        )
        .all(id);
      const responsible = db
        .prepare("SELECT id, name, reg_number, status FROM dogs WHERE responsible_person_id = ? OR owner_person_id = ?")
        .all(id, id);
      const communications = db
        .prepare(
          `SELECT c.*, u.name AS author, d.name AS dog_name FROM communications c
           LEFT JOIN users u ON u.id = c.created_by LEFT JOIN dogs d ON d.id = c.dog_id
           WHERE c.person_id = ? ORDER BY c.date DESC, c.id DESC`,
        )
        .all(id);
      res.json({ ...p, placements, adoptions, dogs: responsible, communications });
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "people", "write");
      assertDate(req.body.gdpr_consent_at, "gdpr_consent_at");
      const data = pick(req.body, PERSON_FIELDS);
      const roles = normaliseRoles(req.body.roles);
      if (roles) data.roles = roles;
      res.json(parsePerson(updateAudited(db, req.user, "people", id, data).after));
    }),
  );

  // Historie důležité komunikace (sekce 8, 9).
  r.post(
    "/:id/communications",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "people", "write");
      requireFields(req.body, ["summary"]);
      assertDate(req.body.date, "date");
      getRow(db, "people", id);
      const row = tx(db, () =>
        createAudited(db, req.user, "communications", {
          person_id: id,
          dog_id: optInt(req.body.dog_id),
          adoption_id: optInt(req.body.adoption_id),
          date: str(req.body.date) ?? today(),
          channel: str(req.body.channel) ?? null,
          summary: String(req.body.summary),
          created_by: req.user!.id,
        }),
      );
      res.status(201).json(row);
    }),
  );

  return r;
}
