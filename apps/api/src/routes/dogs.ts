import { Router, type Request } from "express";
import type { DB, DogStatus } from "../db";
import { DOG_STATUSES, FINAL_DOG_STATUSES, HEALTH_KINDS, tx } from "../db";
import { HttpError, atLeast, fosterDogIds, level, requireDogAccess, requireLevel, requireUser, type Level } from "../auth";
import {
  addDogEvent,
  assertDate,
  assertOneOf,
  createAudited,
  daysBetween,
  deleteAudited,
  getRow,
  pick,
  requireFields,
  today,
  updateAudited,
} from "../audit";
import { h, intParam, str } from "./util";

export const DOG_FIELDS = [
  "name",
  "alias",
  "sex",
  "breed",
  "color",
  "birth_date",
  "birth_estimated",
  "chip",
  "passport",
  "other_id",
  "intake_date",
  "intake_type",
  "intake_origin",
  "location",
  "responsible_person_id",
  "status",
  "end_date",
  "end_reason",
  "death_date",
  "castrated",
  "castration_date",
  "intake_health",
  "temperament",
  "rel_people",
  "rel_children",
  "rel_dogs",
  "rel_cats",
  "handling",
  "alone",
  "hygiene",
  "travel",
  "special_needs",
  "ideal_home",
  "photo_document_id",
] as const;

/** Co vidí dobrovolník (sekce 11, 24): nic citlivého, jen co potřebuje k práci se psem. */
const BASIC_FIELDS = [
  "id",
  "reg_number",
  "name",
  "alias",
  "sex",
  "breed",
  "color",
  "status",
  "location",
  "photo_document_id",
  "temperament",
  "rel_people",
  "rel_dogs",
  "rel_cats",
  "handling",
  "special_needs",
];
/** Dočaskář nevidí původ přijetí ani nového majitele. */
const FOSTER_HIDDEN = ["intake_origin", "owner_person_id", "responsible_person_id"];

export const STATUS_LABEL: Record<DogStatus, string> = {
  new: "Nově přijatý",
  in_care: "V péči",
  foster: "V dočasné péči",
  for_adoption: "K adopci",
  reserved: "Rezervovaný",
  adopted: "Adoptovaný",
  deceased: "Zemřelý",
  ended_other: "Jiné ukončení",
};

type Row = Record<string, unknown>;

export function serializeDog(dog: Row, l: Level): Row {
  const out: Row = { ...dog };
  const end = (dog.end_date as string | null) ?? today();
  out.days_in_care = Math.max(0, daysBetween(dog.intake_date as string, end));
  out.photo_url = dog.photo_document_id ? `/api/documents/${dog.photo_document_id}/file` : null;
  if (l === "basic") {
    return Object.fromEntries(Object.entries(out).filter(([k]) => BASIC_FIELDS.includes(k) || k === "photo_url"));
  }
  if (l === "own") for (const k of FOSTER_HIDDEN) delete out[k];
  return out;
}

/** HAF-RRRR-NNNN podle roku přijetí (otevřený bod 25 — výchozí návrh). */
export function nextRegNumber(db: DB, intakeDate: string): string {
  const year = intakeDate.slice(0, 4);
  const prefix = `HAF-${year}-`;
  const row = db
    .prepare("SELECT MAX(CAST(substr(reg_number, 10) AS INTEGER)) AS n FROM dogs WHERE reg_number LIKE ?")
    .get(prefix + "%") as { n: number | null };
  return prefix + String((row.n ?? 0) + 1).padStart(4, "0");
}

function validateDog(body: Row) {
  assertOneOf(body.status, DOG_STATUSES, "status");
  assertOneOf(body.sex, ["male", "female", "unknown"], "sex");
  for (const f of ["birth_date", "intake_date", "end_date", "castration_date", "death_date"]) assertDate(body[f], f);
}

/** Vedlejší účinky změny stavu psa: časová osa a automatické uzavření evidence. */
export function applyStatusChange(
  db: DB,
  req: Request,
  dogId: number,
  newStatus: DogStatus,
  opts: { date?: string; reason?: string | null; extra?: Record<string, string | number | null> } = {},
) {
  const dog = getRow(db, "dogs", dogId);
  const date = opts.date ?? today();
  const patch: Record<string, string | number | null> = { status: newStatus, ...(opts.extra ?? {}) };
  if (FINAL_DOG_STATUSES.includes(newStatus)) {
    if (!dog.end_date) patch.end_date = date;
    if (opts.reason !== undefined) patch.end_reason = opts.reason;
    if (newStatus === "deceased" && !dog.death_date) patch.death_date = date;
  } else if (FINAL_DOG_STATUSES.includes(dog.status as DogStatus)) {
    // Návrat do péče (např. vrácení po adopci) evidenci znovu otevírá.
    patch.end_date = null;
    patch.end_reason = null;
  }
  updateAudited(db, req.user, "dogs", dogId, patch);
  if (dog.status !== newStatus) {
    addDogEvent(db, req.user, dogId, {
      date,
      type: "status",
      title: `Stav: ${STATUS_LABEL[dog.status as DogStatus]} → ${STATUS_LABEL[newStatus]}`,
      note: opts.reason ?? null,
    });
  }
}

export function dogRoutes(db: DB) {
  const r = Router();

  r.get(
    "/",
    h((req, res) => {
      const l = requireLevel(req, "dogs", "basic");
      const where: string[] = [];
      const args: (string | number)[] = [];
      const status = str(req.query.status);
      if (status === "in_care") where.push(`d.status IN ('new','in_care','foster','for_adoption','reserved')`);
      else if (status === "ended") where.push(`d.status IN ('adopted','deceased','ended_other')`);
      else if (status) {
        assertOneOf(status, DOG_STATUSES, "status");
        where.push("d.status = ?");
        args.push(status);
      }
      const q = str(req.query.q);
      if (q) {
        where.push(l === "basic" ? "(d.name LIKE ? OR d.alias LIKE ? OR d.reg_number LIKE ? OR d.reg_number LIKE ?)" : "(d.name LIKE ? OR d.alias LIKE ? OR d.reg_number LIKE ? OR d.chip LIKE ?)");
        args.push(...Array(4).fill(`%${q}%`));
      }
      if (l === "own") {
        const ids = fosterDogIds(db, requireUser(req));
        where.push(ids.length ? `d.id IN (${ids.join(",")})` : "0");
      }
      const sql = `SELECT d.*, p.first_name || ' ' || p.last_name AS responsible_name FROM dogs d
        LEFT JOIN people p ON p.id = d.responsible_person_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY d.intake_date DESC, d.id DESC`;
      const rows = db.prepare(sql).all(...args) as Row[];
      res.json(rows.map((d) => serializeDog(d, l)));
    }),
  );

  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "dogs", "write");
      requireFields(req.body, ["name", "intake_date"]);
      validateDog(req.body);
      const data = pick(req.body, DOG_FIELDS);
      data.status = data.status ?? "new";
      const dog = tx(db, () => {
        data.reg_number = nextRegNumber(db, String(data.intake_date));
        const d = createAudited(db, req.user, "dogs", data);
        const id = d.id as number;
        addDogEvent(db, req.user, id, {
          date: String(data.intake_date),
          type: "intake",
          title: `Přijetí psa (${d.reg_number})`,
          note: [data.intake_type, data.intake_origin].filter(Boolean).join(" · ") || null,
        });
        if (data.intake_health) {
          createAudited(db, req.user, "health_records", {
            dog_id: id,
            kind: "intake",
            date: String(data.intake_date),
            name: "Vstupní zdravotní stav",
            conclusion: data.intake_health,
            created_by: req.user!.id,
          });
        }
        return getRow(db, "dogs", id);
      });
      res.status(201).json(serializeDog(dog, "write"));
    }),
  );

  r.get(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      const l = requireDogAccess(db, req, "dogs", id, "basic");
      const dog = db
        .prepare(
          `SELECT d.*, p.first_name || ' ' || p.last_name AS responsible_name,
             o.first_name || ' ' || o.last_name AS owner_name
           FROM dogs d LEFT JOIN people p ON p.id = d.responsible_person_id
           LEFT JOIN people o ON o.id = d.owner_person_id WHERE d.id = ?`,
        )
        .get(id) as Row | undefined;
      if (!dog) throw new HttpError(404, "Pes nenalezen");
      const out = serializeDog(dog, l);
      if (l === "own") delete out.owner_name;
      if (atLeast(level(req.user!, "foster"), "read") || l === "own") {
        out.current_placement =
          db
            .prepare(
              `SELECT pl.*, p.first_name || ' ' || p.last_name AS person_name FROM placements pl
               JOIN people p ON p.id = pl.person_id WHERE pl.dog_id = ? AND pl.end_date IS NULL`,
            )
            .get(id) ?? null;
      }
      res.json(out);
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "dogs", "write");
      validateDog(req.body);
      const data = pick(req.body, DOG_FIELDS);
      tx(db, () => {
        const newStatus = data.status as DogStatus | undefined;
        delete data.status;
        const before = getRow(db, "dogs", id);
        if (Object.keys(data).length) updateAudited(db, req.user, "dogs", id, data);
        if (data.location !== undefined && data.location !== before.location) {
          addDogEvent(db, req.user, id, {
            date: today(),
            type: "move",
            title: `Přesun: ${before.location ?? "—"} → ${data.location ?? "—"}`,
          });
        }
        if (data.death_date && !before.death_date && before.status === "adopted") {
          addDogEvent(db, req.user, id, { date: String(data.death_date), type: "death", title: "Úmrtí adoptovaného psa" });
        }
        if (newStatus && newStatus !== before.status) {
          applyStatusChange(db, req, id, newStatus, {
            date: (data.end_date as string) ?? undefined,
            reason: (data.end_reason as string) ?? undefined,
          });
        }
      });
      res.json(serializeDog(getRow(db, "dogs", id), "write"));
    }),
  );

  // ── Časová osa ──
  r.get(
    "/:id/timeline",
    h((req, res) => {
      const id = intParam(req);
      requireDogAccess(db, req, "dogs", id, "read");
      const rows = db
        .prepare(
          `SELECT e.*, u.name AS author FROM dog_events e LEFT JOIN users u ON u.id = e.created_by
           WHERE e.dog_id = ? ORDER BY e.date DESC, e.id DESC`,
        )
        .all(id);
      res.json(rows);
    }),
  );

  r.post(
    "/:id/events",
    h((req, res) => {
      const id = intParam(req);
      const l = requireDogAccess(db, req, "dogs", id, "write");
      requireFields(req.body, ["title"]);
      assertDate(req.body.date, "date");
      const type = req.body.type === "problem" ? "problem" : "note";
      tx(db, () => {
        addDogEvent(db, req.user, id, {
          date: str(req.body.date) ?? today(),
          type,
          title: String(req.body.title),
          note: str(req.body.note) ?? null,
        });
        // Nahlášený problém / požadavek dočaskáře vytvoří úkol pro tým (sekce 10).
        if (type === "problem" || l === "own") {
          const dog = getRow(db, "dogs", id);
          createAudited(
            db,
            req.user,
            "tasks",
            {
              title: `${type === "problem" ? "Problém" : "Požadavek"} – ${dog.name}: ${req.body.title}`,
              description: str(req.body.note) ?? null,
              priority: type === "problem" ? "high" : "normal",
              kind: "request",
              ref_type: "dog",
              ref_id: id,
              due_date: today(),
              created_by: req.user!.id,
            },
            id,
          );
        }
      });
      res.status(201).json({ ok: true });
    }),
  );

  // ── Zdravotní evidence ──
  r.get(
    "/:id/health",
    h((req, res) => {
      const id = intParam(req);
      requireDogAccess(db, req, "health", id, "read");
      res.json({
        records: db.prepare("SELECT * FROM health_records WHERE dog_id = ? ORDER BY date DESC, id DESC").all(id),
        medications: db.prepare("SELECT * FROM medications WHERE dog_id = ? ORDER BY start_date DESC").all(id),
        weights: db.prepare("SELECT * FROM weights WHERE dog_id = ? ORDER BY date ASC").all(id),
      });
    }),
  );

  const HEALTH_FIELDS = [
    "kind",
    "date",
    "name",
    "clinic",
    "vet",
    "reason",
    "conclusion",
    "valid_until",
    "next_due",
    "note",
    "document_id",
  ] as const;
  const KIND_LABEL: Record<string, string> = {
    intake: "Vstupní zdravotní stav",
    vet_visit: "Veterinární návštěva",
    diagnosis: "Diagnóza",
    procedure: "Zákrok",
    vaccination: "Očkování",
    deworming: "Odčervení",
    antiparasitic: "Antiparazitika",
    lab: "Laboratorní výsledek",
    physio: "Fyzioterapie",
  };

  r.post(
    "/:id/health",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "health", "write");
      getRow(db, "dogs", id);
      requireFields(req.body, ["kind", "date"]);
      assertOneOf(req.body.kind, HEALTH_KINDS, "kind");
      for (const f of ["date", "valid_until", "next_due"]) assertDate(req.body[f], f);
      const data = pick(req.body, HEALTH_FIELDS);
      const row = tx(db, () => {
        const rec = createAudited(db, req.user, "health_records", { ...data, dog_id: id, created_by: req.user!.id });
        addDogEvent(db, req.user, id, {
          date: String(data.date),
          type: "health",
          title: `${KIND_LABEL[String(data.kind)]}${data.name ? ": " + data.name : ""}${data.clinic ? " (" + data.clinic + ")" : ""}`,
          note: (data.conclusion as string) ?? (data.reason as string) ?? null,
          ref_type: "health_record",
          ref_id: rec.id as number,
        });
        return rec;
      });
      res.status(201).json(row);
    }),
  );

  r.patch(
    "/:id/health/:rid",
    h((req, res) => {
      const id = intParam(req);
      const rid = intParam(req, "rid");
      requireLevel(req, "health", "write");
      const rec = getRow(db, "health_records", rid);
      if (rec.dog_id !== id) throw new HttpError(404, "Záznam nenalezen");
      for (const f of ["date", "valid_until", "next_due"]) assertDate(req.body[f], f);
      const { after } = updateAudited(db, req.user, "health_records", rid, pick(req.body, HEALTH_FIELDS), id);
      res.json(after);
    }),
  );

  r.delete(
    "/:id/health/:rid",
    h((req, res) => {
      const id = intParam(req);
      const rid = intParam(req, "rid");
      requireLevel(req, "health", "write");
      const rec = getRow(db, "health_records", rid);
      if (rec.dog_id !== id) throw new HttpError(404, "Záznam nenalezen");
      deleteAudited(db, req.user, "health_records", rid, id);
      res.json({ ok: true });
    }),
  );

  const MED_FIELDS = ["name", "dose", "frequency", "start_date", "end_date", "note"] as const;
  r.post(
    "/:id/medications",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "health", "write");
      getRow(db, "dogs", id);
      requireFields(req.body, ["name", "start_date"]);
      assertDate(req.body.start_date, "start_date");
      assertDate(req.body.end_date, "end_date");
      const row = tx(db, () => {
        const m = createAudited(db, req.user, "medications", { ...pick(req.body, MED_FIELDS), dog_id: id });
        addDogEvent(db, req.user, id, {
          date: String(m.start_date),
          type: "health",
          title: `Léčba: ${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? ", " + m.frequency : ""}`,
          ref_type: "medication",
          ref_id: m.id as number,
        });
        return m;
      });
      res.status(201).json(row);
    }),
  );
  r.patch(
    "/:id/medications/:mid",
    h((req, res) => {
      const id = intParam(req);
      const mid = intParam(req, "mid");
      requireLevel(req, "health", "write");
      if (getRow(db, "medications", mid).dog_id !== id) throw new HttpError(404, "Záznam nenalezen");
      res.json(updateAudited(db, req.user, "medications", mid, pick(req.body, MED_FIELDS), id).after);
    }),
  );

  r.post(
    "/:id/weights",
    h((req, res) => {
      const id = intParam(req);
      requireDogAccess(db, req, "health", id, "write"); // dočaskář smí zapsat váhu svého svěřence
      const kg = Number(req.body.kg);
      if (!(kg > 0 && kg < 150)) throw new HttpError(400, "Neplatná hmotnost");
      assertDate(req.body.date, "date");
      const row = createAudited(db, req.user, "weights", {
        dog_id: id,
        date: str(req.body.date) ?? today(),
        kg,
        created_by: req.user!.id,
      });
      res.status(201).json(row);
    }),
  );

  return r;
}
