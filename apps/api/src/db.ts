import { DatabaseSync } from "node:sqlite";

export type DB = DatabaseSync;

/** Stavy psa (sekce 4). Konečné stavy automaticky uzavírají evidenci. */
export const DOG_STATUSES = [
  "new", // nově přijatý
  "in_care", // v péči
  "foster", // v dočasné péči
  "for_adoption", // k adopci
  "reserved", // rezervovaný
  "adopted", // adoptovaný
  "deceased", // zemřelý
  "ended_other", // jiné ukončení
] as const;
export type DogStatus = (typeof DOG_STATUSES)[number];
export const FINAL_DOG_STATUSES: DogStatus[] = ["adopted", "deceased", "ended_other"];
export const IN_CARE_STATUSES: DogStatus[] = ["new", "in_care", "foster", "for_adoption", "reserved"];

/** Workflow adopce (sekce 9). */
export const ADOPTION_STATUSES = [
  "new", // nový zájemce
  "questionnaire", // dotazník
  "contacted", // kontaktován
  "visit", // návštěva
  "approved", // schválen
  "rejected", // zamítnut
  "reserved", // rezervace
  "adopted", // adopce
  "withdrawn", // zájemce odstoupil
] as const;

export const HEALTH_KINDS = [
  "intake", // vstupní zdravotní stav
  "vet_visit",
  "diagnosis",
  "procedure", // operace a zákroky
  "vaccination",
  "deworming",
  "antiparasitic",
  "lab",
  "physio",
] as const;

export const DOCUMENT_CATEGORIES = [
  "record_card", // evidenční karta
  "health_summary",
  "intake",
  "veterinary",
  "adoption",
  "death_end", // úmrtí / ukončení evidence
  "foster_handover", // předávací dokumentace dočasky
  "photo",
  "other",
] as const;

export const DOCUMENT_STATUSES = ["ready", "awaiting_signature", "signed", "missing"] as const;

export const PERSON_ROLES = ["adopter", "foster", "volunteer", "member", "donor", "vet", "partner", "sponsor", "supplier", "other"] as const;
/** Osoba, nebo organizace (dodavatel, partner, sponzor, veterinární klinika). */
export const PERSON_KINDS = ["person", "organization"] as const;


export const DEFAULT_SETTINGS: Record<string, string> = {
  // Kontroly po adopci ve dnech od adopce (otevřený bod 25 — výchozí návrh).
  post_adoption_check_days: JSON.stringify([14, 90, 365]),
  // Kolik dní dopředu hlásit blížící se zdravotní termíny.
  health_alert_days: "14",
  // Žádost o adopci ve stavu „nový zájemce“ déle než N dní = upozornění (sekce 18).
  adoption_response_days: "3",
  // Pes v péči déle než N dní bez čísla čipu = upozornění na chybějící povinný údaj.
  missing_chip_days: "30",
};

export function getSetting<T>(db: DB, key: string): T {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  const raw = row?.value ?? DEFAULT_SETTINGS[key];
  return JSON.parse(raw) as T;
}

/** Spustí fn v transakci. */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
