import { Router } from "express";
import { atLeast, fosterDogIds, level, requireLevel, requireUser } from "../auth";
import { addDays, assertDate, daysBetween, today } from "../audit";
import { IN_CARE_STATUSES, type DB } from "../db";
import { collectAlerts, collectCalendar, runSearch } from "../registry";
import { computeStats } from "../services/stats";
import { pragueNow } from "../time";
import { serializeDog } from "./dogs";
import { visibleTasks } from "./tasks";
import { h, str } from "./util";

type Row = Record<string, unknown>;

/** Nástěnka „Můj Hafanof“ (sekce 3) — přehledová čísla a dnešní práce. Upozornění jsou v /api/alerts. */
export function dashboardRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      const user = requireUser(req);
      const t = today();
      const out: Row = {};
      const dl = level(user, "dogs");
      if (atLeast(dl, "read")) {
        const counts = db.prepare("SELECT status, COUNT(*) AS n FROM dogs GROUP BY status").all() as { status: string; n: number }[];
        const by = Object.fromEntries(counts.map((c) => [c.status, c.n]));
        out.counts = {
          in_care: IN_CARE_STATUSES.reduce((s, k) => s + (by[k] ?? 0), 0),
          in_foster: (db.prepare("SELECT COUNT(DISTINCT dog_id) AS n FROM placements WHERE end_date IS NULL").get() as { n: number }).n,
          for_adoption: by.for_adoption ?? 0,
          reserved: by.reserved ?? 0,
          new: by.new ?? 0,
        };
      }
      if (dl === "own") {
        const ids = fosterDogIds(db, user);
        out.my_dogs = ids.length ? (db.prepare(`SELECT * FROM dogs WHERE id IN (${ids.join(",")})`).all() as Row[]).map((d) => serializeDog(d, "own")) : [];
      }
      if (atLeast(level(user, "tasks"), "own")) {
        const open = "t.status IN ('open','in_progress')";
        out.tasks_today = visibleTasks(db, user, `${open} AND t.due_date = ?`, [t]);
        out.my_tasks_count = visibleTasks(db, user, `${open} AND t.assignee_user_id = ?`, [user.id]).length;
      }
      const hl = level(user, "health");
      if (hl !== "none") {
        const scope = hl === "own" ? `AND m.dog_id IN (${fosterDogIds(db, user).join(",") || "0"})` : "";
        out.medications_active = db
          .prepare(
            `SELECT m.*, d.name AS dog_name FROM medications m JOIN dogs d ON d.id = m.dog_id
             WHERE m.start_date <= ? AND (m.end_date IS NULL OR m.end_date >= ?)
               AND d.status NOT IN ('adopted','deceased','ended_other') ${scope} ORDER BY d.name`,
          )
          .all(t, t);
      }
      if (atLeast(level(user, "adoptions"), "read")) {
        out.adoptions_pending = (
          db
            .prepare(
              `SELECT a.*, d.name AS dog_name, p.first_name || ' ' || p.last_name AS person_name FROM adoptions a
               JOIN dogs d ON d.id = a.dog_id JOIN people p ON p.id = a.person_id
               WHERE a.status IN ('new','questionnaire','contacted','visit','approved') ORDER BY a.applied_at`,
            )
            .all() as Row[]
        ).map((a) => ({ ...a, waiting_days: daysBetween(String(a.applied_at), t) }));
      }
      res.json(out);
    }),
  );
  return r;
}

/** Upozornění ze všech modulů (sekce 18), seřazená podle závažnosti. */
export function alertRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => res.json(collectAlerts(db, requireUser(req)))),
  );
  return r;
}

/** Kalendář (sekce 12) ze všech modulů. */
export function calendarRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      const user = requireUser(req);
      const from = str(req.query.from) ?? today();
      const to = str(req.query.to) ?? addDays(from, 31);
      assertDate(from, "from");
      assertDate(to, "to");
      res.json(collectCalendar(db, user, from, to));
    }),
  );
  return r;
}

/** Globální vyhledávání (sekce 1). Každý modul hledá ve svém; výsledky respektují oprávnění. */
export function searchRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      const user = requireUser(req);
      const q = str(req.query.q);
      if (!q || q.length < 2) return res.json([]);
      res.json(runSearch(db, user, q));
    }),
  );
  return r;
}

/** Statistiky (sekce 17). */
export function statsRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "stats", "read");
      const year = pragueNow().date.slice(0, 4);
      const from = str(req.query.from) ?? `${year}-01-01`;
      const to = str(req.query.to) ?? `${year}-12-31`;
      assertDate(from, "from");
      assertDate(to, "to");
      res.json(computeStats(db, from, to));
    }),
  );
  return r;
}
