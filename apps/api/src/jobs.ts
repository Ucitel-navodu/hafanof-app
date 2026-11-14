import type { DB } from "./db";
import type { JobDef, ModuleContext } from "./modules/types";
import { allJobs } from "./registry";
import { pragueNow } from "./time";

export { TZ, pragueNow } from "./time";

/**
 * Klíč běhu: denní úloha běží jednou za den (po zadaném čase), intervalová jednou za okno.
 * Vrací null, když úloha teď běžet nemá.
 */
export function dueRunKey(job: JobDef, now = new Date()): string | null {
  if ("daily" in job.schedule) {
    const { date, time } = pragueNow(now);
    return time >= job.schedule.daily ? date : null;
  }
  const windowMs = job.schedule.everyMinutes * 60_000;
  return `w${Math.floor(now.getTime() / windowMs)}`;
}

/**
 * Spustí úlohu, pokud pro daný klíč ještě neběžela. Jedinečnost (name, run_key) v DB zajistí,
 * že ani po restartu nebo při dvou instancích neproběhne dvakrát.
 */
export async function runJob(ctx: ModuleContext, job: JobDef, runKey: string): Promise<{ status: "ok" | "error" | "skipped"; message?: string }> {
  const { db } = ctx;
  const claimed = db.prepare("INSERT OR IGNORE INTO job_runs(name, run_key) VALUES (?, ?)").run(job.name, runKey);
  if (claimed.changes === 0) return { status: "skipped" };
  const id = Number(claimed.lastInsertRowid);
  try {
    const message = (await job.run(ctx)) ?? null;
    db.prepare("UPDATE job_runs SET status = 'ok', finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), message = ? WHERE id = ?").run(message, id);
    return { status: "ok", message: message ?? undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    db.prepare("UPDATE job_runs SET status = 'error', finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), message = ? WHERE id = ?").run(message, id);
    console.error(`[jobs] ${job.name} selhala:`, e);
    return { status: "error", message };
  }
}

/** Ruční spuštění ze správy — vždy s novým klíčem. */
export function runJobNow(ctx: ModuleContext, name: string) {
  const job = allJobs().find((j) => j.name === name);
  if (!job) return null;
  return runJob(ctx, job, `manual-${new Date().toISOString()}`);
}

export function jobStatus(db: DB) {
  return allJobs().map((j) => {
    const last = db
      .prepare("SELECT status, started_at, finished_at, message FROM job_runs WHERE name = ? ORDER BY id DESC LIMIT 1")
      .get(j.name) as Record<string, unknown> | undefined;
    return { name: j.name, label: j.label, schedule: j.schedule, last: last ?? null };
  });
}

/** Spustí plánovač (kontrola každou minutu). Vrací funkci pro zastavení. */
export function startScheduler(ctx: ModuleContext, intervalMs = 60_000): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (const job of allJobs()) {
        const key = dueRunKey(job);
        if (key) await runJob(ctx, job, key);
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
