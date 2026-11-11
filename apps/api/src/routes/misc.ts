import { Router } from "express";
import type { DB } from "../db";
import { IN_CARE_STATUSES, getSetting } from "../db";
import {
  HttpError,
  LoginLimiter,
  ROLES,
  SESSION_COOKIE,
  atLeast,
  createSession,
  destroySession,
  fosterDogIds,
  hashPassword,
  level,
  permissionsOf,
  readCookie,
  requireLevel,
  requireUser,
  verifyPassword,
} from "../auth";
import { addDays, audit, createAudited, daysBetween, getRow, requireFields, today, updateAudited } from "../audit";
import { createBackup, listBackups } from "../backup";
import { serializeDog } from "./dogs";
import { calendarItems, visibleTasks } from "./tasks";
import { h, intParam, str } from "./util";

type Row = Record<string, unknown>;

export interface Paths {
  uploadsDir: string;
  backupsDir: string;
  secureCookies: boolean;
}

export function authRoutes(db: DB, paths: Paths) {
  const r = Router();
  const limiter = new LoginLimiter();
  r.post(
    "/login",
    h((req, res) => {
      const email = String(req.body.email ?? "").trim().toLowerCase();
      const password = String(req.body.password ?? "");
      const key = `${email}|${req.ip}`;
      if (!limiter.allowed(key)) throw new HttpError(429, "Příliš mnoho pokusů, zkuste to za 15 minut");
      const u = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as Row | undefined;
      if (!u || !verifyPassword(password, String(u.password_hash))) {
        limiter.failed(key);
        throw new HttpError(401, "Neplatný e-mail nebo heslo");
      }
      limiter.succeeded(key);
      const token = createSession(db, u.id as number);
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: paths.secureCookies,
        maxAge: 30 * 864e5,
        path: "/",
      });
      const user = { id: u.id as number, email: String(u.email), name: String(u.name), roles: JSON.parse(String(u.roles)), person_id: (u.person_id as number) ?? null };
      audit(db, user, "login", "users", user.id);
      res.json({ ...user, permissions: permissionsOf(user) });
    }),
  );
  r.post(
    "/logout",
    h((req, res) => {
      const token = readCookie(req, SESSION_COOKIE);
      if (token) destroySession(db, token);
      if (req.user) audit(db, req.user, "logout", "users", req.user.id);
      res.clearCookie(SESSION_COOKIE, { path: "/" });
      res.json({ ok: true });
    }),
  );
  r.get(
    "/me",
    h((req, res) => {
      const user = requireUser(req);
      res.json({ ...user, permissions: permissionsOf(user) });
    }),
  );
  r.post(
    "/password",
    h((req, res) => {
      const user = requireUser(req);
      const u = getRow(db, "users", user.id);
      if (!verifyPassword(String(req.body.current ?? ""), String(u.password_hash))) throw new HttpError(400, "Současné heslo nesouhlasí");
      const next = String(req.body.next ?? "");
      if (next.length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
      updateAudited(db, user, "users", user.id, { password_hash: hashPassword(next) });
      audit(db, user, "update", "users", user.id, { extra: { password: ["***", "***"] } });
      res.json({ ok: true });
    }),
  );
  return r;
}

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
        out.my_dogs = ids.length
          ? (db.prepare(`SELECT * FROM dogs WHERE id IN (${ids.join(",")})`).all() as Row[]).map((d) => serializeDog(d, "own"))
          : [];
      }
      if (atLeast(level(user, "tasks"), "own")) {
        const open = "t.status IN ('open','in_progress')";
        out.tasks_today = visibleTasks(db, req, `${open} AND t.due_date = ?`, [t]);
        out.tasks_overdue = visibleTasks(db, req, `${open} AND t.due_date < ?`, [t]);
        out.my_tasks_count = visibleTasks(db, req, `${open} AND t.assignee_user_id = ?`, [user.id]).length;
      }
      const hl = level(user, "health");
      if (hl !== "none") {
        const days = getSetting<number>(db, "health_alert_days");
        out.health_upcoming = calendarItems(db, req, addDays(t, -365), addDays(t, days)).filter((i) => i.type === "health").map((i) => ({ ...i, overdue: String(i.date) < t }));
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
      if (atLeast(level(user, "documents"), "read")) {
        out.documents_pending = db
          .prepare(
            `SELECT d.id, d.title, d.status, d.category, d.dog_id, g.name AS dog_name FROM documents d
             LEFT JOIN dogs g ON g.id = d.dog_id WHERE d.deleted_at IS NULL AND d.status IN ('missing','awaiting_signature')
             ORDER BY d.created_at`,
          )
          .all();
      }
      res.json(out);
    }),
  );
  return r;
}

/** Globální vyhledávání (sekce 1). Výsledky respektují oprávnění. */
export function searchRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      const user = requireUser(req);
      const q = str(req.query.q);
      if (!q || q.length < 2) return res.json({ dogs: [], people: [], documents: [], tasks: [] });
      const like = `%${q}%`;
      const out: Row = { dogs: [], people: [], documents: [], tasks: [] };
      const dl = level(user, "dogs");
      if (dl !== "none") {
        // Dobrovolník nehledá podle čísla čipu (není v jeho povolených údajích).
        const chip = dl === "basic" ? "" : " OR chip LIKE ?";
        const args = dl === "basic" ? [like, like, like] : [like, like, like, like];
        let rows = db
          .prepare(`SELECT * FROM dogs WHERE name LIKE ? OR alias LIKE ? OR reg_number LIKE ?${chip} LIMIT 20`)
          .all(...args) as Row[];
        if (dl === "own") {
          const ids = fosterDogIds(db, user);
          rows = rows.filter((d) => ids.includes(d.id as number));
        }
        out.dogs = rows.map((d) => serializeDog(d, dl));
      }
      if (atLeast(level(user, "people"), "read")) {
        const nq = `%${q.replace(/\s/g, "")}%`;
        out.people = db
          .prepare(
            `SELECT id, first_name, last_name, phone, email, roles FROM people
             WHERE first_name || ' ' || last_name LIKE ? OR phone LIKE ? OR replace(phone,' ','') LIKE ? OR email LIKE ? LIMIT 20`,
          )
          .all(like, like, nq, like);
      }
      if (atLeast(level(user, "documents"), "read")) {
        out.documents = db
          .prepare(
            `SELECT d.id, d.title, d.category, d.dog_id, g.name AS dog_name FROM documents d LEFT JOIN dogs g ON g.id = d.dog_id
             WHERE d.deleted_at IS NULL AND (d.title LIKE ? OR d.original_name LIKE ?) LIMIT 20`,
          )
          .all(like, like);
      }
      if (atLeast(level(user, "tasks"), "own")) {
        out.tasks = visibleTasks(db, req, "(t.title LIKE ? OR t.description LIKE ?)", [like, like]).slice(0, 20);
      }
      if (atLeast(level(user, "health"), "read")) {
        out.health = db
          .prepare(
            `SELECT h.id, h.dog_id, h.kind, h.date, h.name, h.conclusion, d.name AS dog_name FROM health_records h
             JOIN dogs d ON d.id = h.dog_id WHERE h.name LIKE ? OR h.conclusion LIKE ? OR h.reason LIKE ? LIMIT 20`,
          )
          .all(like, like, like);
      }
      res.json(out);
    }),
  );
  return r;
}

/** Statistiky (sekce 17). Náklady přijdou s modulem financí (milník 2). */
export function statsRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "stats", "read");
      const year = new Date().getUTCFullYear();
      const from = str(req.query.from) ?? `${year}-01-01`;
      const to = str(req.query.to) ?? `${year}-12-31`;
      const t = today();
      const intake = (db.prepare("SELECT COUNT(*) AS n FROM dogs WHERE intake_date BETWEEN ? AND ?").get(from, to) as { n: number }).n;
      const adoptions = (
        db.prepare("SELECT COUNT(*) AS n FROM adoptions WHERE status = 'adopted' AND adopted_at BETWEEN ? AND ?").get(from, to) as { n: number }
      ).n;
      const ended = db
        .prepare("SELECT status, COUNT(*) AS n FROM dogs WHERE end_date BETWEEN ? AND ? GROUP BY status")
        .all(from, to) as { status: string; n: number }[];
      const inCare = (
        db.prepare(`SELECT COUNT(*) AS n FROM dogs WHERE status IN (${IN_CARE_STATUSES.map((s) => `'${s}'`).join(",")})`).get() as { n: number }
      ).n;
      const inFoster = (db.prepare("SELECT COUNT(DISTINCT dog_id) AS n FROM placements WHERE end_date IS NULL").get() as { n: number }).n;
      const stays = db.prepare("SELECT intake_date, end_date FROM dogs WHERE end_date BETWEEN ? AND ?").all(from, to) as Row[];
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
      const current = db
        .prepare(`SELECT intake_date FROM dogs WHERE end_date IS NULL`)
        .all() as Row[];
      res.json({
        period: { from, to },
        intake,
        adoptions,
        ended: Object.fromEntries(ended.map((e) => [e.status, e.n])),
        in_care: inCare,
        in_foster: inFoster,
        avg_stay_days_ended: avg(stays.map((s) => daysBetween(String(s.intake_date), String(s.end_date)))),
        avg_stay_days_current: avg(current.map((s) => daysBetween(String(s.intake_date), t))),
        costs: null,
      });
    }),
  );
  return r;
}

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

export function userRoutes(db: DB) {
  const r = Router();
  const pub = (u: Row) => ({ id: u.id, email: u.email, name: u.name, roles: JSON.parse(String(u.roles)), person_id: u.person_id, active: !!u.active, created_at: u.created_at });

  /** Seznam jmen pro přiřazení úkolů — bez citlivých údajů. */
  r.get(
    "/lookup",
    h((req, res) => {
      requireLevel(req, "tasks", "read");
      res.json(db.prepare("SELECT id, name FROM users WHERE active = 1 ORDER BY name").all());
    }),
  );

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "users", "read");
      res.json((db.prepare("SELECT * FROM users ORDER BY name").all() as Row[]).map(pub));
    }),
  );

  const validateRoles = (roles: unknown) => {
    if (!Array.isArray(roles) || roles.some((x) => !(ROLES as readonly string[]).includes(x))) throw new HttpError(400, "Neplatné role");
    return JSON.stringify(roles);
  };

  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "users", "write");
      requireFields(req.body, ["email", "name", "password"]);
      if (String(req.body.password).length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
      const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(String(req.body.email).trim().toLowerCase());
      if (exists) throw new HttpError(409, "Uživatel s tímto e-mailem už existuje");
      const u = createAudited(db, req.user, "users", {
        email: String(req.body.email).trim().toLowerCase(),
        name: String(req.body.name),
        password_hash: hashPassword(String(req.body.password)),
        roles: validateRoles(req.body.roles ?? []),
        person_id: req.body.person_id ? Number(req.body.person_id) : null,
      });
      res.status(201).json(pub(u));
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "users", "write");
      const patch: Record<string, string | number | null> = {};
      if (req.body.name !== undefined) patch.name = String(req.body.name);
      if (req.body.roles !== undefined) patch.roles = validateRoles(req.body.roles);
      if (req.body.active !== undefined) patch.active = req.body.active ? 1 : 0;
      if (req.body.person_id !== undefined) patch.person_id = req.body.person_id ? Number(req.body.person_id) : null;
      if (req.body.password) {
        if (String(req.body.password).length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
        patch.password_hash = hashPassword(String(req.body.password));
      }
      if (id === req.user!.id && (patch.active === 0 || (patch.roles && !JSON.parse(String(patch.roles)).includes("admin"))))
        throw new HttpError(400, "Nelze odebrat administrátorská práva sám sobě");
      const { after } = updateAudited(db, req.user, "users", id, patch);
      if (patch.active === 0 || patch.password_hash) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
      res.json(pub(after));
    }),
  );
  return r;
}

export function adminRoutes(db: DB, paths: Paths) {
  const r = Router();
  r.get(
    "/backups",
    h((req, res) => {
      requireLevel(req, "backup", "write");
      res.json(listBackups(paths.backupsDir));
    }),
  );
  r.post(
    "/backups",
    h((req, res) => {
      requireLevel(req, "backup", "write");
      const b = createBackup(db, paths.uploadsDir, paths.backupsDir);
      audit(db, req.user, "backup", "system", null, { extra: { name: b.name } });
      res.status(201).json({ name: b.name });
    }),
  );
  r.get(
    "/settings",
    h((req, res) => {
      requireLevel(req, "users", "read");
      res.json(Object.fromEntries((db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[]).map((s) => [s.key, JSON.parse(s.value)])));
    }),
  );
  r.patch(
    "/settings",
    h((req, res) => {
      requireLevel(req, "users", "write");
      const days = req.body.post_adoption_check_days;
      if (days !== undefined) {
        if (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d <= 0)) throw new HttpError(400, "Neplatné intervaly");
        const before = db.prepare("SELECT value FROM settings WHERE key = 'post_adoption_check_days'").get() as { value: string };
        db.prepare("UPDATE settings SET value = ? WHERE key = 'post_adoption_check_days'").run(JSON.stringify(days));
        audit(db, req.user, "update", "settings", null, { extra: { post_adoption_check_days: [JSON.parse(before.value), days] } });
      }
      res.json({ ok: true });
    }),
  );
  return r;
}
