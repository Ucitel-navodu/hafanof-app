import type { Router } from "express";
import type { DB } from "../db";
import type { AuthUser, Level, Module } from "../auth";

/** Cesty k datům, které aplikace používá (předávají se modulům). */
export interface Paths {
  dataDir: string;
  uploadsDir: string;
  backupsDir: string;
  secureCookies: boolean;
}

export interface ModuleContext {
  db: DB;
  paths: Paths;
}

/**
 * Migrace schématu. Každý modul má vlastní rozsah ID (viz docs/vyvoj/moduly.md),
 * takže se migrace různých modulů nikdy nepotkají. Jednou nasazenou migraci už nikdy neměňte —
 * přidejte novou.
 */
export interface Migration {
  id: number;
  name: string;
  up: (db: DB) => void;
}

export type Severity = "danger" | "warning" | "info";

/** Upozornění (sekce 18) — nástěnka, zvoneček a e-mailový souhrn. */
export interface Alert {
  /** Stabilní klíč (např. "health:due:12"), používá se pro odškrtnutí a deduplikaci. */
  key: string;
  module: string;
  severity: Severity;
  title: string;
  detail?: string | null;
  /** Datum, ke kterému se upozornění vztahuje (YYYY-MM-DD). */
  date?: string | null;
  /** Odkaz v aplikaci (cesta webu, např. "/psi/12?tab=health"). */
  link?: string | null;
}

export interface AlertProvider {
  module: Module;
  min: Level;
  collect: (db: DB, user: AuthUser) => Alert[];
}

/** Položka kalendáře (sekce 12). */
export interface CalendarItem {
  date: string;
  /** Strojový typ (např. "task", "health", "shift"). */
  type: string;
  /** Lidský popis typu pro legendu („Úkol“, „Zdraví“…). */
  label: string;
  /** Barevný tón štítku: taupe | gold | green | red | blue | purple | muted. */
  tone: string;
  title: string;
  link?: string | null;
  module: string;
  /** Volitelné: čas „HH:MM“ (směny, akce). */
  time?: string | null;
  dog_id?: number | null;
  task_id?: number | null;
}

export interface CalendarProvider {
  module: Module;
  min: Level;
  collect: (db: DB, user: AuthUser, from: string, to: string) => CalendarItem[];
}

export interface SearchItem {
  id: number | string;
  title: string;
  subtitle?: string | null;
  /** Cesta webu, nebo URL souboru (pak external = true). */
  link: string;
  external?: boolean;
}

export interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

export interface SearchProvider {
  module: Module;
  min: Level;
  search: (db: DB, user: AuthUser, q: string) => SearchGroup | null;
}

/** Naplánovaná úloha (zálohy, e-mailové souhrny…). Čas je v Europe/Prague. */
export interface JobDef {
  name: string;
  /** Lidský popis pro správu. */
  label: string;
  schedule: { daily: string } | { everyMinutes: number };
  run: (ctx: ModuleContext) => string | void | Promise<string | void>;
}

/**
 * Typ navázání dokumentu na záznam modulu (např. účtenka → finanční pohyb).
 * Přístup k takovému dokumentu řídí výhradně modul (ne obecné oprávnění „documents“),
 * aby se finanční nebo spolkové doklady nedostaly k lidem, kteří modul nevidí.
 */
export interface DocumentRef {
  refType: string;
  /** Smí uživatel dokument vidět/stáhnout? */
  canView: (db: DB, user: AuthUser, refId: number) => boolean;
  /** Smí uživatel k záznamu nahrát/upravit/smazat dokument? */
  canAttach: (db: DB, user: AuthUser, refId: number) => boolean;
  /** Povolené hodnoty `category` pro dokumenty této vazby (výchozí: kategorie dokumentů psa). */
  categories?: readonly string[];
}

export interface ApiModule {
  name: string;
  migrations?: Migration[];
  /** Routery připojené pod /api/<path>. */
  routes?: { path: string; router: (ctx: ModuleContext) => Router }[];
  alerts?: AlertProvider[];
  calendar?: CalendarProvider[];
  search?: SearchProvider[];
  jobs?: JobDef[];
  documentRefs?: DocumentRef[];
  /** Ukázková data pro `HAFANOF_DEMO=1 npm run seed`. */
  seedDemo?: (db: DB) => void;
}
