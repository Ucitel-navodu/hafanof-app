import { Router } from "express";
import type { DB } from "../db";
import { ADOPTION_STATUSES, getSetting, tx } from "../db";
import { HttpError, requireLevel } from "../auth";
import {
  addDays,
  addDogEvent,
  assertDate,
  assertOneOf,
  createAudited,
  getRow,
  pick,
  requireFields,
  today,
  updateAudited,
} from "../audit";
import { applyStatusChange } from "./dogs";
import { ensurePersonRole } from "./people";
import { h, intParam, optInt, str } from "./util";

type Row = Record<string, unknown>;

export const ADOPTION_LABEL: Record<string, string> = {
  new: "Nový zájemce",
  questionnaire: "Dotazník",
  contacted: "Kontaktován",
  visit: "Návštěva",
  approved: "Schválen",
  rejected: "Zamítnut",
  reserved: "Rezervace",
  adopted: "Adopce",
  withdrawn: "Odstoupil",
};
const CLOSED = ["rejected", "adopted", "withdrawn"];

export function adoptionRoutes(db: DB) {
  const r = Router();

  const list = db.prepare(
    `SELECT a.*, d.name AS dog_name, d.reg_number, p.first_name || ' ' || p.last_name AS person_name,
       p.phone AS person_phone, p.email AS person_email
     FROM adoptions a JOIN dogs d ON d.id = a.dog_id JOIN people p ON p.id = a.person_id`,
  );

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "adoptions", "read");
      const dogId = optInt(req.query.dog_id);
      const open = req.query.open === "1";
      let rows = list.all() as Row[];
      if (dogId) rows = rows.filter((a) => a.dog_id === dogId);
      if (open) rows = rows.filter((a) => !CLOSED.includes(String(a.status)));
      rows.sort((a, b) => String(b.applied_at).localeCompare(String(a.applied_at)));
      res.json(rows);
    }),
  );

  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "adoptions", "write");
      requireFields(req.body, ["dog_id", "person_id"]);
      assertDate(req.body.applied_at, "applied_at");
      assertDate(req.body.visit_at, "visit_at");
      const dogId = Number(req.body.dog_id);
      const personId = Number(req.body.person_id);
      const dog = getRow(db, "dogs", dogId);
      getRow(db, "people", personId);
      if (["adopted", "deceased", "ended_other"].includes(String(dog.status)))
        throw new HttpError(409, "Pes už není v evidenci k adopci");
      const row = tx(db, () => {
        const a = createAudited(db, req.user, "adoptions", {
          dog_id: dogId,
          person_id: personId,
          status: str(req.body.status) ?? "new",
          applied_at: str(req.body.applied_at) ?? today(),
          questionnaire: str(req.body.questionnaire) ?? null,
          visit_at: str(req.body.visit_at) ?? null,
          notes: str(req.body.notes) ?? null,
        });
        ensurePersonRole(db, req.user, personId, "adopter");
        const person = getRow(db, "people", personId);
        addDogEvent(db, req.user, dogId, {
          date: String(a.applied_at),
          type: "adoption",
          title: `Žádost o adopci: ${person.first_name} ${person.last_name}`.trim(),
          ref_type: "adoption",
          ref_id: a.id as number,
        });
        return a;
      });
      res.status(201).json(row);
    }),
  );

  r.get(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "adoptions", "read");
      const a = (list.all() as Row[]).find((x) => x.id === id);
      if (!a) throw new HttpError(404, "Adopce nenalezena");
      const communications = db
        .prepare(
          `SELECT c.*, u.name AS author FROM communications c LEFT JOIN users u ON u.id = c.created_by
           WHERE c.adoption_id = ? ORDER BY c.date DESC, c.id DESC`,
        )
        .all(id);
      const documents = db
        .prepare("SELECT * FROM documents WHERE adoption_id = ? AND deleted_at IS NULL ORDER BY created_at DESC")
        .all(id);
      const checks = db
        .prepare("SELECT * FROM tasks WHERE ref_type = 'adoption' AND ref_id = ? AND kind = 'post_adoption_check' ORDER BY due_date")
        .all(id);
      res.json({ ...a, communications, documents, checks });
    }),
  );

  /**
   * Posun ve workflow (sekce 9). Vedlejší účinky:
   *  - rejected  → vyžaduje interní důvod zamítnutí
   *  - reserved  → pes rezervovaný (jen jeden aktivní rezervující zájemce)
   *  - adopted   → pes adoptovaný, uzavření evidence, nový majitel, ukončení DP,
   *                automatické kontroly po adopci
   *  - zrušení rezervace vrací psa do stavu „k adopci“
   */
  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "adoptions", "write");
      assertOneOf(req.body.status, ADOPTION_STATUSES, "status");
      for (const f of ["visit_at", "adopted_at", "applied_at"]) assertDate(req.body[f], f);
      const before = getRow(db, "adoptions", id);
      const data = pick(req.body, ["status", "questionnaire", "visit_at", "rejection_reason", "adopted_at", "notes"]);
      const newStatus = (data.status as string | undefined) ?? String(before.status);
      const dogId = before.dog_id as number;

      if (newStatus === "rejected" && !(data.rejection_reason ?? before.rejection_reason))
        throw new HttpError(400, "U zamítnutí je povinný interní důvod");

      const result = tx(db, () => {
        if (newStatus === "reserved" && before.status !== "reserved") {
          const other = db
            .prepare("SELECT id FROM adoptions WHERE dog_id = ? AND status = 'reserved' AND id != ?")
            .get(dogId, id);
          if (other) throw new HttpError(409, "Pes je už rezervovaný pro jiného zájemce");
        }
        if (newStatus === "adopted") data.adopted_at = data.adopted_at ?? (before.adopted_at as string | null) ?? today();

        const { after } = updateAudited(db, req.user, "adoptions", id, data, dogId);
        const dog = getRow(db, "dogs", dogId);
        const person = getRow(db, "people", before.person_id as number);
        const who = `${person.first_name} ${person.last_name}`.trim();

        if (newStatus !== before.status) {
          addDogEvent(db, req.user, dogId, {
            date: today(),
            type: "adoption",
            title: `Adopce – ${who}: ${ADOPTION_LABEL[String(before.status)]} → ${ADOPTION_LABEL[newStatus]}`,
            note: newStatus === "rejected" ? null : ((data.notes as string) ?? null), // důvod zamítnutí je interní
            ref_type: "adoption",
            ref_id: id,
          });
          if (newStatus === "visit" && after.visit_at) {
            createAudited(
              db,
              req.user,
              "tasks",
              {
                title: `Adopční návštěva – ${dog.name} / ${who}`,
                due_date: String(after.visit_at),
                kind: "adoption_visit",
                ref_type: "adoption",
                ref_id: id,
                created_by: req.user!.id,
              },
              dogId,
            );
          }
        }

        if (newStatus === "reserved" && dog.status !== "reserved") applyStatusChange(db, req, dogId, "reserved");
        if (before.status === "reserved" && !["reserved", "adopted"].includes(newStatus) && dog.status === "reserved")
          applyStatusChange(db, req, dogId, "for_adoption", { reason: "Zrušená rezervace" });

        if (newStatus === "adopted" && before.status !== "adopted") {
          const date = String(after.adopted_at);
          // Ukončit případnou dočasnou péči.
          const placement = db
            .prepare("SELECT id FROM placements WHERE dog_id = ? AND end_date IS NULL")
            .get(dogId) as Row | undefined;
          if (placement)
            updateAudited(db, req.user, "placements", placement.id as number, { end_date: date, end_reason: "adoption" }, dogId);
          applyStatusChange(db, req, dogId, "adopted", {
            date,
            reason: "Adopce",
            extra: { owner_person_id: person.id as number, location: `Nový domov: ${who}` },
          });
          // Ostatní otevřené žádosti zůstávají, ale jsou viditelně neaktuální — tým je uzavře ručně.
          const days = getSetting<number[]>(db, "post_adoption_check_days");
          for (const d of days) {
            createAudited(
              db,
              req.user,
              "tasks",
              {
                title: `Kontrola po adopci (${d} dní) – ${dog.name} / ${who}`,
                due_date: addDays(date, d),
                kind: "post_adoption_check",
                ref_type: "adoption",
                ref_id: id,
                created_by: req.user!.id,
              },
              dogId,
            );
          }
        }
        return after;
      });
      res.json(result);
    }),
  );

  return r;
}

const ITEM_FIELDS = ["item", "quantity", "returned"] as const;

/** Dočasná péče (sekce 10). */
export function placementRoutes(db: DB) {
  const r = Router();

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "foster", "read");
      const dogId = optInt(req.query.dog_id);
      const personId = optInt(req.query.person_id);
      const where: string[] = [];
      const args: number[] = [];
      if (dogId) (where.push("pl.dog_id = ?"), args.push(dogId));
      if (personId) (where.push("pl.person_id = ?"), args.push(personId));
      if (req.query.active === "1") where.push("pl.end_date IS NULL");
      const rows = db
        .prepare(
          `SELECT pl.*, d.name AS dog_name, d.reg_number, p.first_name || ' ' || p.last_name AS person_name
           FROM placements pl JOIN dogs d ON d.id = pl.dog_id JOIN people p ON p.id = pl.person_id
           ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY pl.start_date DESC, pl.id DESC`,
        )
        .all(...args) as Row[];
      const items = db.prepare("SELECT * FROM placement_items WHERE placement_id = ?");
      res.json(rows.map((p) => ({ ...p, items: items.all(p.id as number) })));
    }),
  );

  /** Předání psa do DP. Případná předchozí DP se ukončí (= přesun). */
  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "foster", "write");
      requireFields(req.body, ["dog_id", "person_id", "start_date"]);
      assertDate(req.body.start_date, "start_date");
      const dogId = Number(req.body.dog_id);
      const personId = Number(req.body.person_id);
      const dog = getRow(db, "dogs", dogId);
      const person = getRow(db, "people", personId);
      if (["adopted", "deceased", "ended_other"].includes(String(dog.status)))
        throw new HttpError(409, "Pes už není v evidenci");
      const start = String(req.body.start_date);
      const who = `${person.first_name} ${person.last_name}`.trim();
      const row = tx(db, () => {
        const prev = db.prepare("SELECT * FROM placements WHERE dog_id = ? AND end_date IS NULL").get(dogId) as
          | Row
          | undefined;
        if (prev) updateAudited(db, req.user, "placements", prev.id as number, { end_date: start, end_reason: "transfer" }, dogId);
        const pl = createAudited(db, req.user, "placements", {
          dog_id: dogId,
          person_id: personId,
          start_date: start,
          note: str(req.body.note) ?? null,
        });
        for (const it of (req.body.items as Row[] | undefined) ?? []) {
          if (!str(it.item)) continue;
          createAudited(db, req.user, "placement_items", { placement_id: pl.id as number, ...pick(it, ITEM_FIELDS) }, dogId);
        }
        ensurePersonRole(db, req.user, personId, "foster");
        addDogEvent(db, req.user, dogId, {
          date: start,
          type: "foster",
          title: prev ? `Přesun do DP: ${who}` : `Předání do DP: ${who}`,
          note: str(req.body.note) ?? null,
          ref_type: "placement",
          ref_id: pl.id as number,
        });
        const statusPatch = dog.status === "for_adoption" || dog.status === "reserved" ? undefined : "foster";
        updateAudited(db, req.user, "dogs", dogId, { location: `DP: ${who}`, responsible_person_id: personId });
        if (statusPatch && dog.status !== "foster") applyStatusChange(db, req, dogId, "foster", { date: start });
        return pl;
      });
      res.status(201).json(row);
    }),
  );

  /** Vrácení psa z DP. */
  r.post(
    "/:id/end",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "foster", "write");
      assertDate(req.body.end_date, "end_date");
      const pl = getRow(db, "placements", id);
      if (pl.end_date) throw new HttpError(409, "Dočasná péče už je ukončená");
      const dogId = pl.dog_id as number;
      const end = str(req.body.end_date) ?? today();
      tx(db, () => {
        updateAudited(db, req.user, "placements", id, { end_date: end, end_reason: str(req.body.end_reason) ?? "return" }, dogId);
        addDogEvent(db, req.user, dogId, {
          date: end,
          type: "foster",
          title: "Návrat z DP",
          note: str(req.body.note) ?? null,
          ref_type: "placement",
          ref_id: id,
        });
        updateAudited(db, req.user, "dogs", dogId, { location: str(req.body.location) ?? "Hafanof" });
        const dog = getRow(db, "dogs", dogId);
        if (dog.status === "foster") applyStatusChange(db, req, dogId, "in_care", { date: end });
      });
      res.json(getRow(db, "placements", id));
    }),
  );

  r.post(
    "/:id/items",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "foster", "write");
      requireFields(req.body, ["item"]);
      const pl = getRow(db, "placements", id);
      res
        .status(201)
        .json(createAudited(db, req.user, "placement_items", { placement_id: id, ...pick(req.body, ITEM_FIELDS) }, pl.dog_id as number));
    }),
  );

  r.patch(
    "/items/:iid",
    h((req, res) => {
      const iid = intParam(req, "iid");
      requireLevel(req, "foster", "write");
      const item = getRow(db, "placement_items", iid);
      const pl = getRow(db, "placements", item.placement_id as number);
      res.json(updateAudited(db, req.user, "placement_items", iid, pick(req.body, ITEM_FIELDS), pl.dog_id as number).after);
    }),
  );

  return r;
}
