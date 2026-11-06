import { Router, type Request } from "express";
import type { DB } from "../db";
import { tx } from "../db";
import { HttpError, atLeast, fosterDogIds, level, requireLevel, requireUser } from "../auth";
import { addDays, assertDate, assertOneOf, createAudited, getRow, pick, requireFields, today, updateAudited } from "../audit";
import { h, intParam, optInt, str } from "./util";

type Row = Record<string, unknown>;
const TASK_FIELDS = [
  "title",
  "description",
  "assignee_user_id",
  "due_date",
  "priority",
  "status",
  "ref_type",
  "ref_id",
  "recurrence_days",
] as const;
const REF_TYPES = ["dog", "person", "adoption", "placement", "other"];

const TASK_SELECT = `SELECT t.*, u.name AS assignee_name, c.name AS created_by_name,
  CASE t.ref_type
    WHEN 'dog' THEN (SELECT name FROM dogs WHERE id = t.ref_id)
    WHEN 'person' THEN (SELECT first_name || ' ' || last_name FROM people WHERE id = t.ref_id)
    WHEN 'adoption' THEN (SELECT d.name FROM adoptions a JOIN dogs d ON d.id = a.dog_id WHERE a.id = t.ref_id)
    WHEN 'placement' THEN (SELECT d.name FROM placements p JOIN dogs d ON d.id = p.dog_id WHERE p.id = t.ref_id)
  END AS ref_label,
  CASE t.ref_type
    WHEN 'dog' THEN t.ref_id
    WHEN 'adoption' THEN (SELECT dog_id FROM adoptions WHERE id = t.ref_id)
    WHEN 'placement' THEN (SELECT dog_id FROM placements WHERE id = t.ref_id)
  END AS dog_id
  FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id LEFT JOIN users c ON c.id = t.created_by`;

/** Úkoly, které uživatel vidí. "own" = přidělené jemu nebo jím vytvořené. */
export function visibleTasks(db: DB, req: Request, extraWhere = "1", args: (string | number)[] = []): Row[] {
  const user = requireUser(req);
  const l = level(user, "tasks");
  if (l === "none") return [];
  const scope = l === "own" ? "(t.assignee_user_id = ? OR t.created_by = ?)" : "1";
  const scopeArgs = l === "own" ? [user.id, user.id] : [];
  return db
    .prepare(`SELECT * FROM (${TASK_SELECT} WHERE ${scope}) t WHERE ${extraWhere} ORDER BY t.due_date IS NULL, t.due_date, t.id`)
    .all(...scopeArgs, ...args) as Row[];
}

function loadTask(db: DB, req: Request, id: number): Row {
  const t = visibleTasks(db, req, "t.id = ?", [id])[0];
  if (!t) throw new HttpError(404, "Úkol nenalezen");
  return t;
}

export function taskRoutes(db: DB) {
  const r = Router();

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "tasks", "own");
      const where: string[] = [];
      const args: (string | number)[] = [];
      if (req.query.mine === "1") (where.push("t.assignee_user_id = ?"), args.push(req.user!.id));
      if (req.query.open !== "0") where.push("t.status IN ('open','in_progress')");
      if (req.query.overdue === "1") (where.push("t.due_date < ?"), args.push(today()));
      const dogId = optInt(req.query.dog_id);
      if (dogId) (where.push("t.dog_id = ?"), args.push(dogId));
      const refType = str(req.query.ref_type);
      const refId = optInt(req.query.ref_id);
      if (refType && refId) (where.push("t.ref_type = ? AND t.ref_id = ?"), args.push(refType, refId));
      const rows = visibleTasks(db, req, where.length ? where.join(" AND ") : "1", args);
      const t = today();
      res.json(rows.map((x) => ({ ...x, overdue: !!x.due_date && String(x.due_date) < t && ["open", "in_progress"].includes(String(x.status)) })));
    }),
  );

  r.post(
    "/",
    h((req, res) => {
      const l = requireLevel(req, "tasks", "own");
      requireFields(req.body, ["title"]);
      assertDate(req.body.due_date, "due_date");
      assertOneOf(req.body.priority, ["low", "normal", "high"], "priority");
      assertOneOf(req.body.ref_type, REF_TYPES, "ref_type");
      const data = pick(req.body, TASK_FIELDS);
      if (l === "own") {
        // Dočaskář / dobrovolník zakládá jen požadavky k vlastním psům nebo bez vazby.
        data.kind = "request";
        delete data.assignee_user_id;
        if (data.ref_type && !(data.ref_type === "dog" && fosterDogIds(db, req.user!).includes(Number(data.ref_id))))
          throw new HttpError(403, "Nedostatečné oprávnění");
      }
      const row = createAudited(db, req.user, "tasks", { ...data, created_by: req.user!.id }, data.ref_type === "dog" ? Number(data.ref_id) : null);
      res.status(201).json(row);
    }),
  );

  r.get(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "tasks", "own");
      const t = loadTask(db, req, id);
      const comments = db
        .prepare(
          `SELECT c.*, u.name AS author FROM task_comments c LEFT JOIN users u ON u.id = c.user_id
           WHERE c.task_id = ? ORDER BY c.created_at, c.id`,
        )
        .all(id);
      const attachments = db
        .prepare("SELECT id, title, mime, original_name FROM documents WHERE task_id = ? AND deleted_at IS NULL")
        .all(id) as Row[];
      res.json({ ...t, comments, attachments: attachments.map((a) => ({ ...a, url: `/api/documents/${a.id}/file` })) });
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      const l = requireLevel(req, "tasks", "own");
      const t = loadTask(db, req, id);
      assertDate(req.body.due_date, "due_date");
      assertOneOf(req.body.status, ["open", "in_progress", "done", "cancelled"], "status");
      assertOneOf(req.body.priority, ["low", "normal", "high"], "priority");
      // "own" smí jen měnit stav (potvrzení splnění, sekce 11).
      const data = l === "own" ? pick(req.body, ["status"]) : pick(req.body, TASK_FIELDS);
      if (l === "own" && t.assignee_user_id !== req.user!.id && t.created_by !== req.user!.id)
        throw new HttpError(403, "Nedostatečné oprávnění");
      const result = tx(db, () => {
        if (data.status === "done" && t.status !== "done") data.completed_at = new Date().toISOString();
        if (data.status && data.status !== "done") data.completed_at = null;
        const { after } = updateAudited(db, req.user, "tasks", id, data, (t.dog_id as number) ?? null);
        // Opakovaný úkol: po splnění založit další výskyt.
        if (data.status === "done" && t.status !== "done" && after.recurrence_days) {
          const base = (after.due_date as string) ?? today();
          createAudited(
            db,
            req.user,
            "tasks",
            {
              title: after.title as string,
              description: (after.description as string) ?? null,
              assignee_user_id: (after.assignee_user_id as number) ?? null,
              due_date: addDays(base, Number(after.recurrence_days)),
              priority: after.priority as string,
              kind: after.kind as string,
              ref_type: (after.ref_type as string) ?? null,
              ref_id: (after.ref_id as number) ?? null,
              recurrence_days: after.recurrence_days as number,
              created_by: req.user!.id,
            },
            (t.dog_id as number) ?? null,
          );
        }
        return after;
      });
      res.json(result);
    }),
  );

  r.post(
    "/:id/comments",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "tasks", "own");
      loadTask(db, req, id);
      requireFields(req.body, ["body"]);
      res
        .status(201)
        .json(createAudited(db, req.user, "task_comments", { task_id: id, user_id: req.user!.id, body: String(req.body.body) }));
    }),
  );

  return r;
}

/** Kalendář (sekce 12): úkoly, zdravotní termíny, adopční návštěvy. */
export function calendarItems(db: DB, req: Request, from: string, to: string) {
  const user = requireUser(req);
  const items: Row[] = [];
  for (const t of visibleTasks(db, req, "t.due_date BETWEEN ? AND ? AND t.status IN ('open','in_progress')", [from, to])) {
    items.push({ date: t.due_date, type: t.kind === "post_adoption_check" ? "check" : t.kind === "adoption_visit" ? "visit" : "task", title: t.title, task_id: t.id, dog_id: t.dog_id ?? null, priority: t.priority });
  }
  const hl = level(user, "health");
  if (hl !== "none") {
    const scope =
      hl === "own" ? `AND h.dog_id IN (${fosterDogIds(db, user).join(",") || "0"})` : "";
    const health = db
      .prepare(
        `SELECT h.*, d.name AS dog_name FROM health_records h JOIN dogs d ON d.id = h.dog_id
         WHERE d.status NOT IN ('adopted','deceased','ended_other') ${scope}
           AND ((h.next_due BETWEEN ? AND ?) OR (h.valid_until BETWEEN ? AND ?))`,
      )
      .all(from, to, from, to) as Row[];
    for (const r of health) {
      if (r.next_due && String(r.next_due) >= from && String(r.next_due) <= to)
        items.push({ date: r.next_due, type: "health", title: `${r.dog_name}: kontrola / další dávka${r.name ? " – " + r.name : ""}`, dog_id: r.dog_id });
      if (r.valid_until && String(r.valid_until) >= from && String(r.valid_until) <= to)
        items.push({ date: r.valid_until, type: "health", title: `${r.dog_name}: končí platnost – ${r.name ?? r.kind}`, dog_id: r.dog_id });
    }
  }
  items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return items;
}

export function calendarRoutes(db: DB) {
  const r = Router();
  r.get(
    "/",
    h((req, res) => {
      requireUser(req);
      const from = str(req.query.from) ?? today();
      const to = str(req.query.to) ?? addDays(from, 31);
      assertDate(from, "from");
      assertDate(to, "to");
      res.json(calendarItems(db, req, from, to));
    }),
  );
  return r;
}

