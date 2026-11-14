import { Router } from "express";
import type { DB } from "../db";
import { HttpError, requireLevel } from "../auth";
import { audit } from "../audit";
import { createBackup, listBackups } from "../backup";
import { jobStatus, runJobNow } from "../jobs";
import type { Paths } from "../modules/types";
import { h } from "./util";

const positiveInt = (v: unknown) => Number.isInteger(v) && (v as number) > 0;

/** Nastavení upravitelná ve Správě. Moduly přidávají vlastní klíče do SETTING_VALIDATORS přes registerSetting. */
export const SETTING_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  post_adoption_check_days: (v) => Array.isArray(v) && v.length > 0 && v.every(positiveInt),
  health_alert_days: positiveInt,
  adoption_response_days: positiveInt,
  missing_chip_days: positiveInt,
};

/** Modul si může zaregistrovat vlastní nastavení (validátor hodnoty). */
export function registerSetting(key: string, validate: (v: unknown) => boolean) {
  SETTING_VALIDATORS[key] = validate;
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
      const changes: Record<string, [unknown, unknown]> = {};
      for (const [key, check] of Object.entries(SETTING_VALIDATORS)) {
        const value = req.body[key];
        if (value === undefined) continue;
        if (!check(value)) throw new HttpError(400, `Neplatná hodnota nastavení ${key}`);
        const before = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
        db.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
        changes[key] = [before ? JSON.parse(before.value) : null, value];
      }
      if (Object.keys(changes).length) audit(db, req.user, "update", "settings", null, { extra: changes });
      res.json({ ok: true });
    }),
  );

  // Naplánované úlohy (zálohy, e-mailové souhrny…) — stav a ruční spuštění.
  r.get(
    "/jobs",
    h((req, res) => {
      requireLevel(req, "users", "read");
      res.json(jobStatus(db));
    }),
  );
  r.post(
    "/jobs/:name/run",
    h(async (req, res) => {
      requireLevel(req, "users", "write");
      const result = await runJobNow({ db, paths }, String(req.params.name));
      if (!result) throw new HttpError(404, "Neznámá úloha");
      audit(db, req.user, "update", "system", null, { extra: { job: [null, req.params.name], result: [null, result.status] } });
      res.json(result);
    }),
  );
  return r;
}
