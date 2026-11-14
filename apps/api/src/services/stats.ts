import { IN_CARE_STATUSES, type DB } from "../db";
import { daysBetween, today } from "../audit";

type Row = Record<string, unknown>;

export interface StatsResult {
  period: { from: string; to: string };
  intake: number;
  adoptions: number;
  ended: Record<string, number>;
  in_care: number;
  in_foster: number;
  avg_stay_days_ended: number | null;
  avg_stay_days_current: number | null;
  /** Doplní modul financí (milník 2). */
  costs: unknown;
  [key: string]: unknown;
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Statistiky za období (sekce 17). Sdílí je obrazovka Statistiky i exporty. */
export function computeStats(db: DB, from: string, to: string): StatsResult {
  const t = today();
  const intake = (db.prepare("SELECT COUNT(*) AS n FROM dogs WHERE intake_date BETWEEN ? AND ?").get(from, to) as { n: number }).n;
  const adoptions = (
    db.prepare("SELECT COUNT(*) AS n FROM adoptions WHERE status = 'adopted' AND adopted_at BETWEEN ? AND ?").get(from, to) as { n: number }
  ).n;
  const ended = db.prepare("SELECT status, COUNT(*) AS n FROM dogs WHERE end_date BETWEEN ? AND ? GROUP BY status").all(from, to) as {
    status: string;
    n: number;
  }[];
  const inCare = (
    db.prepare(`SELECT COUNT(*) AS n FROM dogs WHERE status IN (${IN_CARE_STATUSES.map((s) => `'${s}'`).join(",")})`).get() as { n: number }
  ).n;
  const inFoster = (db.prepare("SELECT COUNT(DISTINCT dog_id) AS n FROM placements WHERE end_date IS NULL").get() as { n: number }).n;
  const stays = db.prepare("SELECT intake_date, end_date FROM dogs WHERE end_date BETWEEN ? AND ?").all(from, to) as Row[];
  const current = db.prepare("SELECT intake_date FROM dogs WHERE end_date IS NULL").all() as Row[];
  return {
    period: { from, to },
    intake,
    adoptions,
    ended: Object.fromEntries(ended.map((e) => [e.status, e.n])),
    in_care: inCare,
    in_foster: inFoster,
    avg_stay_days_ended: avg(stays.map((s) => daysBetween(String(s.intake_date), String(s.end_date)))),
    avg_stay_days_current: avg(current.map((s) => daysBetween(String(s.intake_date), t))),
    costs: null,
  };
}
