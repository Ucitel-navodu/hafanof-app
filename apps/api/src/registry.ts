import { atLeast, level, type AuthUser } from "./auth";
import type { DB } from "./db";
import { MODULE_LIST } from "./modules";
import type { Alert, CalendarItem, DocumentRef, JobDef, SearchGroup } from "./modules/types";

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 } as const;

/**
 * Upozornění pro uživatele ze všech modulů. Poskytovatel se zavolá jen tehdy,
 * když má uživatel v daném modulu potřebnou úroveň přístupu. Chyba jednoho
 * poskytovatele nesmí shodit celou nástěnku — zaloguje se a pokračuje se dál.
 */
export function collectAlerts(db: DB, user: AuthUser): Alert[] {
  const out: Alert[] = [];
  const seen = new Set<string>();
  for (const m of MODULE_LIST) {
    for (const p of m.alerts ?? []) {
      if (!atLeast(level(user, p.module), p.min)) continue;
      try {
        for (const a of p.collect(db, user)) {
          if (seen.has(a.key)) continue;
          seen.add(a.key);
          out.push(a);
        }
      } catch (e) {
        console.error(`[alerts] ${m.name}/${p.module}:`, e);
      }
    }
  }
  return out.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || String(a.date ?? "9999").localeCompare(String(b.date ?? "9999")),
  );
}

export function collectCalendar(db: DB, user: AuthUser, from: string, to: string): CalendarItem[] {
  const out: CalendarItem[] = [];
  for (const m of MODULE_LIST) {
    for (const p of m.calendar ?? []) {
      if (!atLeast(level(user, p.module), p.min)) continue;
      try {
        out.push(...p.collect(db, user, from, to));
      } catch (e) {
        console.error(`[calendar] ${m.name}/${p.module}:`, e);
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.time ?? "").localeCompare(String(b.time ?? "")));
}

export function runSearch(db: DB, user: AuthUser, q: string): SearchGroup[] {
  const out: SearchGroup[] = [];
  for (const m of MODULE_LIST) {
    for (const p of m.search ?? []) {
      if (!atLeast(level(user, p.module), p.min)) continue;
      try {
        const g = p.search(db, user, q);
        if (g && g.items.length) out.push(g);
      } catch (e) {
        console.error(`[search] ${m.name}/${p.module}:`, e);
      }
    }
  }
  return out;
}

export function allJobs(): JobDef[] {
  return MODULE_LIST.flatMap((m) => m.jobs ?? []);
}

export function documentRef(refType: string): DocumentRef | undefined {
  for (const m of MODULE_LIST) for (const r of m.documentRefs ?? []) if (r.refType === refType) return r;
  return undefined;
}
