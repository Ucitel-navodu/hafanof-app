import { atLeast, fosterDogIds, level, type AuthUser } from "../auth";
import { addDays, daysBetween, today } from "../audit";
import { getSetting, type DB } from "../db";
import { m001 } from "../migrations/001_initial";
import { m002 } from "../migrations/002_platform";
import { visibleTasks } from "../routes/tasks";
import { czDate } from "../time";
import type { ApiModule, CalendarItem, SearchGroup } from "./types";

type Row = Record<string, unknown>;

const OPEN_TASK = "t.status IN ('open','in_progress')";
const ACTIVE_DOG = "d.status NOT IN ('adopted','deceased','ended_other')";

function healthScope(db: DB, user: AuthUser, alias = "h") {
  return level(user, "health") === "own" ? `AND ${alias}.dog_id IN (${fosterDogIds(db, user).join(",") || "0"})` : "";
}

/** Zdravotní termíny (další kontrola/dávka, konec platnosti očkování) v intervalu. */
function healthItems(db: DB, user: AuthUser, from: string, to: string): CalendarItem[] {
  const rows = db
    .prepare(
      `SELECT h.*, d.name AS dog_name FROM health_records h JOIN dogs d ON d.id = h.dog_id
       WHERE ${ACTIVE_DOG} ${healthScope(db, user)}
         AND ((h.next_due BETWEEN ? AND ?) OR (h.valid_until BETWEEN ? AND ?))`,
    )
    .all(from, to, from, to) as Row[];
  const out: CalendarItem[] = [];
  for (const r of rows) {
    const base = { type: "health", label: "Zdraví", tone: "red", module: "health", link: `/psi/${r.dog_id}?tab=health`, dog_id: r.dog_id as number };
    if (r.next_due && String(r.next_due) >= from && String(r.next_due) <= to)
      out.push({ ...base, date: String(r.next_due), title: `${r.dog_name}: kontrola / další dávka${r.name ? " – " + r.name : ""}` });
    if (r.valid_until && String(r.valid_until) >= from && String(r.valid_until) <= to)
      out.push({ ...base, date: String(r.valid_until), title: `${r.dog_name}: končí platnost – ${r.name ?? r.kind}` });
  }
  return out;
}

const TASK_TYPE: Record<string, [string, string, string]> = {
  post_adoption_check: ["check", "Kontrola po adopci", "green"],
  adoption_visit: ["visit", "Adopční návštěva", "purple"],
};

/** Jádro evidence (milník 1): migrace, upozornění, kalendář a vyhledávání pro psy, zdraví, úkoly, adopce a dokumenty. */
export const coreModule: ApiModule = {
  name: "core",
  migrations: [m001, m002],

  calendar: [
    {
      module: "tasks",
      min: "own",
      collect: (db, user, from, to) =>
        visibleTasks(db, user, `t.due_date BETWEEN ? AND ? AND ${OPEN_TASK}`, [from, to]).map((t) => {
          const [type, label, tone] = TASK_TYPE[String(t.kind)] ?? ["task", "Úkol", "taupe"];
          return {
            date: String(t.due_date),
            type,
            label,
            tone,
            title: String(t.title),
            link: `/ukoly?id=${t.id}`,
            module: "tasks",
            task_id: t.id as number,
            dog_id: (t.dog_id as number) ?? null,
          };
        }),
    },
    { module: "health", min: "own", collect: healthItems },
  ],

  alerts: [
    {
      module: "tasks",
      min: "own",
      collect: (db, user) =>
        visibleTasks(db, user, `${OPEN_TASK} AND t.due_date < ?`, [today()]).map((t) => ({
          key: `task:overdue:${t.id}`,
          module: "tasks",
          severity: "danger" as const,
          title: `Po termínu: ${t.title}`,
          detail: [t.assignee_name, t.ref_label].filter(Boolean).join(" · ") || null,
          date: String(t.due_date),
          link: `/ukoly?id=${t.id}`,
        })),
    },
    {
      // Kontroly, očkování a další dávky: po termínu = danger, v nastaveném okně = warning.
      module: "health",
      min: "own",
      collect: (db, user) => {
        const t = today();
        const days = getSetting<number>(db, "health_alert_days");
        return healthItems(db, user, addDays(t, -365), addDays(t, days)).map((i) => ({
          key: `health:${i.dog_id}:${i.date}:${i.title}`,
          module: "health",
          severity: i.date < t ? ("danger" as const) : ("warning" as const),
          title: i.title,
          date: i.date,
          link: i.link,
        }));
      },
    },
    {
      module: "adoptions",
      min: "read",
      collect: (db) => {
        // Žádost o adopci bez reakce (sekce 18): stav „nový zájemce“ déle než N dní.
        const limit = getSetting<number>(db, "adoption_response_days");
        const t = today();
        return (
          db
            .prepare(
              `SELECT a.id, a.applied_at, d.name AS dog_name, p.first_name || ' ' || p.last_name AS person_name FROM adoptions a
               JOIN dogs d ON d.id = a.dog_id JOIN people p ON p.id = a.person_id WHERE a.status = 'new'`,
            )
            .all() as Row[]
        )
          .filter((a) => daysBetween(String(a.applied_at), t) >= limit)
          .map((a) => ({
            key: `adoption:noresponse:${a.id}`,
            module: "adoptions",
            severity: "warning" as const,
            title: `Žádost bez reakce ${daysBetween(String(a.applied_at), t)} dní: ${a.dog_name} ← ${a.person_name}`,
            date: String(a.applied_at),
            link: `/adopce?id=${a.id}`,
          }));
      },
    },
    {
      module: "documents",
      min: "read",
      collect: (db) =>
        (
          db
            .prepare(
              `SELECT d.id, d.title, d.status, d.dog_id, g.name AS dog_name FROM documents d LEFT JOIN dogs g ON g.id = d.dog_id
               WHERE d.deleted_at IS NULL AND d.ref_type IS NULL AND d.status IN ('missing','awaiting_signature') ORDER BY d.created_at`,
            )
            .all() as Row[]
        ).map((d) => ({
          key: `document:${d.status}:${d.id}`,
          module: "documents",
          severity: d.status === "missing" ? ("warning" as const) : ("info" as const),
          title: `${d.status === "missing" ? "Chybí dokument" : "Čeká na podpis"}: ${d.title}${d.dog_name ? ` (${d.dog_name})` : ""}`,
          link: d.dog_id ? `/psi/${d.dog_id}?tab=docs` : null,
        })),
    },
    {
      // Chybějící povinný údaj (sekce 18): pes v péči déle než N dní bez čipu.
      module: "dogs",
      min: "read",
      collect: (db) => {
        const limit = getSetting<number>(db, "missing_chip_days");
        return (
          db
            .prepare(`SELECT d.id, d.name, d.intake_date FROM dogs d WHERE ${ACTIVE_DOG} AND (d.chip IS NULL OR d.chip = '') AND d.intake_date <= ?`)
            .all(addDays(today(), -limit)) as Row[]
        ).map((d) => ({
          key: `dog:nochip:${d.id}`,
          module: "dogs",
          severity: "warning" as const,
          title: `${d.name}: chybí číslo čipu (v péči od ${czDate(String(d.intake_date))})`,
          link: `/psi/${d.id}`,
        }));
      },
    },
  ],

  search: [
    {
      module: "dogs",
      min: "basic",
      search: (db, user, q) => {
        const dl = level(user, "dogs");
        const like = `%${q}%`;
        // Dobrovolník nehledá podle čísla čipu (není v jeho povolených údajích).
        const chip = dl === "basic" ? "" : " OR chip LIKE ?";
        const args = dl === "basic" ? [like, like, like] : [like, like, like, like];
        let rows = db.prepare(`SELECT id, name, reg_number, status FROM dogs WHERE name LIKE ? OR alias LIKE ? OR reg_number LIKE ?${chip} LIMIT 20`).all(...args) as Row[];
        if (dl === "own") {
          const ids = fosterDogIds(db, user);
          rows = rows.filter((d) => ids.includes(d.id as number));
        }
        return { key: "dogs", label: "Psi", items: rows.map((d) => ({ id: d.id as number, title: String(d.name), subtitle: String(d.reg_number), link: `/psi/${d.id}` })) };
      },
    },
    {
      module: "people",
      min: "read",
      search: (db, _user, q) => {
        const like = `%${q}%`;
        const rows = db
          .prepare(
            `SELECT id, first_name, last_name, phone, email FROM people
             WHERE first_name || ' ' || last_name LIKE ? OR phone LIKE ? OR replace(phone,' ','') LIKE ? OR email LIKE ? LIMIT 20`,
          )
          .all(like, like, `%${q.replace(/\s/g, "")}%`, like) as Row[];
        return {
          key: "people",
          label: "Osoby",
          items: rows.map((p) => ({
            id: p.id as number,
            title: `${p.first_name} ${p.last_name}`.trim(),
            subtitle: [p.phone, p.email].filter(Boolean).join(" · ") || null,
            link: `/osoby/${p.id}`,
          })),
        };
      },
    },
    {
      module: "documents",
      min: "read",
      search: (db, _user, q) => {
        const like = `%${q}%`;
        const rows = db
          .prepare(
            `SELECT d.id, d.title, d.dog_id, g.name AS dog_name, d.stored_name FROM documents d LEFT JOIN dogs g ON g.id = d.dog_id
             WHERE d.deleted_at IS NULL AND d.ref_type IS NULL AND (d.title LIKE ? OR d.original_name LIKE ?) LIMIT 20`,
          )
          .all(like, like) as Row[];
        return {
          key: "documents",
          label: "Dokumenty",
          items: rows.map((d) => ({
            id: d.id as number,
            title: String(d.title),
            subtitle: (d.dog_name as string) ?? null,
            link: d.stored_name ? `/api/documents/${d.id}/file` : d.dog_id ? `/psi/${d.dog_id}?tab=docs` : "/",
            external: !!d.stored_name,
          })),
        };
      },
    },
    {
      module: "health",
      min: "read",
      search: (db, _user, q) => {
        const like = `%${q}%`;
        const rows = db
          .prepare(
            `SELECT h.id, h.dog_id, h.date, h.name, h.kind, d.name AS dog_name FROM health_records h
             JOIN dogs d ON d.id = h.dog_id WHERE h.name LIKE ? OR h.conclusion LIKE ? OR h.reason LIKE ? LIMIT 20`,
          )
          .all(like, like, like) as Row[];
        return {
          key: "health",
          label: "Zdravotní záznamy",
          items: rows.map((h) => ({ id: h.id as number, title: `${h.dog_name}: ${h.name ?? h.kind}`, subtitle: String(h.date), link: `/psi/${h.dog_id}?tab=health` })),
        };
      },
    },
    {
      module: "tasks",
      min: "own",
      search: (db, user, q): SearchGroup => ({
        key: "tasks",
        label: "Úkoly",
        items: visibleTasks(db, user, "(t.title LIKE ? OR t.description LIKE ?)", [`%${q}%`, `%${q}%`])
          .slice(0, 20)
          .map((t) => ({ id: t.id as number, title: String(t.title), subtitle: (t.due_date as string) ?? null, link: `/ukoly?id=${t.id}` })),
      }),
    },
  ],
};

/** Pomocná funkce pro moduly: dá se uživateli ukázat daný modul? */
export const canSee = (user: AuthUser, module: Parameters<typeof level>[1], min: Parameters<typeof atLeast>[1]) => atLeast(level(user, module), min);
