import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "../db";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "../db";
import { HttpError, atLeast, level, requireDogAccess, requireLevel, requireUser } from "../auth";
import { addDogEvent, assertOneOf, audit, createAudited, getRow, pick, today, updateAudited } from "../audit";
import { documentRef } from "../registry";
import type { DocumentRef } from "../modules/types";
import { h, intParam, optInt, str } from "./util";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
/** Kategorie, které dočaskář u svého svěřence vidí. */
const FOSTER_VISIBLE = ["photo", "foster_handover", "veterinary", "health_summary"];

type Row = Record<string, unknown>;

export const CATEGORY_LABEL: Record<string, string> = {
  record_card: "Evidenční karta",
  health_summary: "Zdravotní přehled",
  intake: "Dokumentace k přijetí",
  veterinary: "Veterinární dokumentace",
  adoption: "Adopční dokumentace",
  death_end: "Úmrtí / ukončení evidence",
  foster_handover: "Předávací dokumentace (DP)",
  photo: "Fotografie",
  other: "Ostatní",
};

export function documentRoutes(db: DB, uploadsDir: string) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new HttpError(400, "Nepodporovaný typ souboru (povoleno PDF, DOC/DOCX, obrázky)"));
    },
  });

  const r = Router();

  /** Registrovaný typ vazby na záznam modulu (ref_type), nebo 400. */
  function refOf(refType: string): DocumentRef {
    const ref = documentRef(refType);
    if (!ref) throw new HttpError(400, `Neznámý typ vazby dokumentu: ${refType}`);
    return ref;
  }

  /** Kontrola přístupu k dokumentu podle toho, k čemu je navázaný. */
  function canSee(req: Parameters<typeof requireUser>[0], doc: Row): boolean {
    const user = requireUser(req);
    // Dokument navázaný na záznam modulu: rozhoduje výhradně modul.
    if (doc.ref_type) return refOf(String(doc.ref_type)).canView(db, user, Number(doc.ref_id));
    const l = level(user, "documents");
    if (atLeast(l, "read")) return true;
    if (l === "own" && doc.dog_id && FOSTER_VISIBLE.includes(String(doc.category))) {
      try {
        requireDogAccess(db, req, "documents", Number(doc.dog_id), "read");
        return true;
      } catch {
        return false;
      }
    }
    // Profilovou fotku psa vidí každý, kdo psa vidí (i dobrovolník).
    if (doc.category === "photo" && doc.dog_id) {
      const dog = db.prepare("SELECT photo_document_id FROM dogs WHERE id = ?").get(Number(doc.dog_id)) as Row | undefined;
      if (dog?.photo_document_id === doc.id && atLeast(level(user, "dogs"), "basic")) {
        if (level(user, "dogs") !== "own") return true;
        try {
          requireDogAccess(db, req, "dogs", Number(doc.dog_id), "basic");
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  r.get(
    "/",
    h((req, res) => {
      const refType = str(req.query.ref_type);
      if (refType) {
        // Dokumenty záznamu modulu (např. účtenky pohybu) — přístup řídí modul.
        const refId = optInt(req.query.ref_id);
        if (refId === null) throw new HttpError(400, "Chybí ref_id");
        if (!refOf(refType).canView(db, requireUser(req), refId)) throw new HttpError(404, "Záznam nenalezen");
        const rows = db
          .prepare(
            `SELECT d.*, u.name AS uploaded_by_name FROM documents d LEFT JOIN users u ON u.id = d.uploaded_by
             WHERE d.deleted_at IS NULL AND d.ref_type = ? AND d.ref_id = ? ORDER BY d.created_at DESC, d.id DESC`,
          )
          .all(refType, refId) as Row[];
        return res.json(rows.map((d) => ({ ...d, url: d.stored_name ? `/api/documents/${d.id}/file` : null })));
      }
      const l = requireLevel(req, "documents", "own");
      // Doklady modulů (účtenky…) se v obecném seznamu nezobrazují.
      const where = ["d.deleted_at IS NULL", "d.ref_type IS NULL"];
      const args: (string | number)[] = [];
      for (const k of ["dog_id", "person_id", "adoption_id", "task_id"] as const) {
        const v = optInt(req.query[k]);
        if (v !== null) {
          where.push(`d.${k} = ?`);
          args.push(v);
        }
      }
      const status = str(req.query.status);
      if (status) {
        where.push("d.status = ?");
        args.push(status);
      }
      if (l === "own") {
        const dogId = optInt(req.query.dog_id);
        if (dogId === null) throw new HttpError(400, "Chybí dog_id");
        requireDogAccess(db, req, "documents", dogId, "read");
        where.push(`d.category IN (${FOSTER_VISIBLE.map((c) => `'${c}'`).join(",")})`);
      }
      const rows = db
        .prepare(
          `SELECT d.*, u.name AS uploaded_by_name, g.name AS dog_name FROM documents d
           LEFT JOIN users u ON u.id = d.uploaded_by LEFT JOIN dogs g ON g.id = d.dog_id
           WHERE ${where.join(" AND ")} ORDER BY d.created_at DESC, d.id DESC`,
        )
        .all(...args) as Row[];
      res.json(rows.map((d) => ({ ...d, url: d.stored_name ? `/api/documents/${d.id}/file` : null })));
    }),
  );

  r.post(
    "/",
    upload.single("file"),
    h((req, res) => {
      const body = req.body as Row;
      const refType = str(body.ref_type);
      if (refType) return uploadForRef(req, res, refType, body);
      const l = requireLevel(req, "documents", "own");
      const dogId = optInt(body.dog_id);
      const category = str(body.category) ?? "other";
      assertOneOf(category, DOCUMENT_CATEGORIES, "category");
      const status = str(body.status) ?? (req.file ? "ready" : "missing");
      assertOneOf(status, DOCUMENT_STATUSES, "status");
      const cleanup = () => req.file && fs.rmSync(req.file.path, { force: true });
      try {
        if (l === "own") {
          // Dočaskář smí nahrát jen fotky svého svěřence.
          if (!dogId || category !== "photo") throw new HttpError(403, "Nedostatečné oprávnění");
          requireDogAccess(db, req, "documents", dogId, "write");
        }
        if (dogId) getRow(db, "dogs", dogId);
        const title = str(body.title) ?? req.file?.originalname ?? CATEGORY_LABEL[category];
        const doc = createAudited(db, req.user, "documents", {
          dog_id: dogId,
          person_id: optInt(body.person_id),
          adoption_id: optInt(body.adoption_id),
          task_id: optInt(body.task_id),
          category,
          title,
          status,
          stored_name: req.file?.filename ?? null,
          original_name: req.file?.originalname ?? null,
          mime: req.file?.mimetype ?? null,
          size: req.file?.size ?? null,
          uploaded_by: req.user!.id,
        });
        if (dogId) {
          addDogEvent(db, req.user, dogId, {
            date: today(),
            type: "document",
            title: `${CATEGORY_LABEL[category]}: ${title}`,
            ref_type: "document",
            ref_id: doc.id as number,
          });
          // První fotka se stane profilovou, nebo když o to klient požádá.
          const dog = getRow(db, "dogs", dogId);
          const wantsProfile = body.set_profile === "1" && l !== "own";
          if (category === "photo" && (wantsProfile || !dog.photo_document_id)) {
            updateAudited(db, req.user, "dogs", dogId, { photo_document_id: doc.id as number });
          }
        }
        res.status(201).json({ ...doc, url: doc.stored_name ? `/api/documents/${doc.id}/file` : null });
      } catch (e) {
        cleanup();
        throw e;
      }
    }),
  );

  /** Nahrání dokumentu k záznamu modulu (ref_type + ref_id). Bez události v časové ose psa. */
  function uploadForRef(req: Parameters<Parameters<typeof h>[0]>[0], res: Parameters<Parameters<typeof h>[0]>[1], refType: string, body: Row) {
    const cleanup = () => req.file && fs.rmSync(req.file.path, { force: true });
    try {
      const ref = refOf(refType);
      const refId = optInt(body.ref_id);
      if (refId === null) throw new HttpError(400, "Chybí ref_id");
      if (!ref.canAttach(db, requireUser(req), refId)) throw new HttpError(403, "Nedostatečné oprávnění");
      const category = str(body.category) ?? "other";
      assertOneOf(category, DOCUMENT_CATEGORIES, "category");
      const status = str(body.status) ?? (req.file ? "ready" : "missing");
      assertOneOf(status, DOCUMENT_STATUSES, "status");
      const dogId = optInt(body.dog_id);
      if (dogId) getRow(db, "dogs", dogId);
      const doc = createAudited(db, req.user, "documents", {
        ref_type: refType,
        ref_id: refId,
        dog_id: dogId,
        person_id: optInt(body.person_id),
        category,
        title: str(body.title) ?? req.file?.originalname ?? "Doklad",
        status,
        stored_name: req.file?.filename ?? null,
        original_name: req.file?.originalname ?? null,
        mime: req.file?.mimetype ?? null,
        size: req.file?.size ?? null,
        uploaded_by: req.user!.id,
      });
      res.status(201).json({ ...doc, url: doc.stored_name ? `/api/documents/${doc.id}/file` : null });
    } catch (e) {
      cleanup();
      throw e;
    }
  }

  /** Smí uživatel dokument upravit/smazat? */
  function requireManage(req: Parameters<typeof requireUser>[0], doc: Row) {
    if (doc.ref_type) {
      if (!refOf(String(doc.ref_type)).canAttach(db, requireUser(req), Number(doc.ref_id))) throw new HttpError(403, "Nedostatečné oprávnění");
    } else requireLevel(req, "documents", "write");
  }

  r.get(
    "/:id/file",
    h((req, res) => {
      const id = intParam(req);
      const doc = getRow(db, "documents", id);
      if (doc.deleted_at || !doc.stored_name || !canSee(req, doc)) throw new HttpError(404, "Dokument nenalezen");
      const file = path.join(uploadsDir, String(doc.stored_name));
      if (!fs.existsSync(file)) throw new HttpError(404, "Soubor chybí");
      res.setHeader("Content-Type", String(doc.mime ?? "application/octet-stream"));
      res.setHeader("X-Content-Type-Options", "nosniff");
      const inline = String(doc.mime).startsWith("image/") || doc.mime === "application/pdf";
      res.setHeader(
        "Content-Disposition",
        `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(String(doc.original_name ?? "dokument"))}`,
      );
      fs.createReadStream(file).pipe(res);
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireManage(req, getRow(db, "documents", id));
      assertOneOf(req.body.status, DOCUMENT_STATUSES, "status");
      assertOneOf(req.body.category, DOCUMENT_CATEGORIES, "category");
      const { after } = updateAudited(db, req.user, "documents", id, pick(req.body, ["title", "status", "category"]));
      res.json(after);
    }),
  );

  /** Měkké smazání — soubor zůstává, záznam o smazání je v auditu (sekce 19). */
  r.delete(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      const before = getRow(db, "documents", id);
      requireManage(req, before);
      if (before.deleted_at) throw new HttpError(404, "Dokument nenalezen");
      db.prepare("UPDATE documents SET deleted_at = datetime('now') WHERE id = ?").run(id);
      audit(db, req.user, "delete", "documents", id, { before, dogId: (before.dog_id as number) ?? null });
      res.json({ ok: true });
    }),
  );

  return r;
}
