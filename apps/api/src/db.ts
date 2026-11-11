import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

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

export const PERSON_ROLES = ["adopter", "foster", "volunteer", "member", "donor", "vet", "other"] as const;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT, email TEXT, address TEXT,
  roles TEXT NOT NULL DEFAULT '[]',
  foster_capacity INTEGER, foster_availability TEXT, foster_limits TEXT,
  gdpr_consent_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles TEXT NOT NULL DEFAULT '[]',
  person_id INTEGER REFERENCES people(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dogs (
  id INTEGER PRIMARY KEY,
  reg_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  alias TEXT,
  sex TEXT CHECK (sex IN ('male','female','unknown')) DEFAULT 'unknown',
  breed TEXT, color TEXT,
  birth_date TEXT, birth_estimated INTEGER NOT NULL DEFAULT 0,
  chip TEXT, passport TEXT, other_id TEXT,
  intake_date TEXT NOT NULL,
  intake_type TEXT, intake_origin TEXT,
  location TEXT,
  responsible_person_id INTEGER REFERENCES people(id),
  status TEXT NOT NULL DEFAULT 'new',
  end_date TEXT, end_reason TEXT,
  owner_person_id INTEGER REFERENCES people(id),
  death_date TEXT,
  castrated INTEGER NOT NULL DEFAULT 0, castration_date TEXT,
  intake_health TEXT,
  temperament TEXT, rel_people TEXT, rel_children TEXT, rel_dogs TEXT, rel_cats TEXT,
  handling TEXT, alone TEXT, hygiene TEXT, travel TEXT, special_needs TEXT, ideal_home TEXT,
  photo_document_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS dogs_status ON dogs(status);

CREATE TABLE IF NOT EXISTS dog_events (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  ref_type TEXT, ref_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS dog_events_dog ON dog_events(dog_id, date);

CREATE TABLE IF NOT EXISTS health_records (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  name TEXT,
  clinic TEXT, vet TEXT, reason TEXT, conclusion TEXT,
  valid_until TEXT,
  next_due TEXT,
  note TEXT,
  document_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS health_dog ON health_records(dog_id);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  name TEXT NOT NULL, dose TEXT, frequency TEXT,
  start_date TEXT NOT NULL, end_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weights (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  date TEXT NOT NULL,
  kg REAL NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER REFERENCES dogs(id),
  person_id INTEGER REFERENCES people(id),
  adoption_id INTEGER,
  task_id INTEGER,
  category TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  stored_name TEXT,
  original_name TEXT, mime TEXT, size INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS adoptions (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  person_id INTEGER NOT NULL REFERENCES people(id),
  status TEXT NOT NULL DEFAULT 'new',
  applied_at TEXT NOT NULL,
  questionnaire TEXT,
  visit_at TEXT,
  rejection_reason TEXT,
  adopted_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS communications (
  id INTEGER PRIMARY KEY,
  person_id INTEGER REFERENCES people(id),
  dog_id INTEGER REFERENCES dogs(id),
  adoption_id INTEGER REFERENCES adoptions(id),
  date TEXT NOT NULL,
  channel TEXT,
  summary TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS placements (
  id INTEGER PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id),
  person_id INTEGER NOT NULL REFERENCES people(id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  end_reason TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS placement_items (
  id INTEGER PRIMARY KEY,
  placement_id INTEGER NOT NULL REFERENCES placements(id),
  item TEXT NOT NULL,
  quantity TEXT,
  returned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee_user_id INTEGER REFERENCES users(id),
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  kind TEXT NOT NULL DEFAULT 'task',
  ref_type TEXT, ref_id INTEGER,
  recurrence_days INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS task_comments (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Auditní stopa (sekce 19). Řádky nelze měnit ani mazat ani přes SQL z aplikace.
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_id INTEGER,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  dog_id INTEGER,
  changes TEXT
);
CREATE INDEX IF NOT EXISTS audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_dog ON audit_log(dog_id);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_log
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_log
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  // Kontroly po adopci ve dnech od adopce (otevřený bod 25 — výchozí návrh).
  post_adoption_check_days: JSON.stringify([14, 90, 365]),
  // Kolik dní dopředu hlásit blížící se zdravotní termíny.
  health_alert_days: "14",
};

export function openDb(dataDir: string): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "hafanof.sqlite"));
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  const ins = db.prepare("INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, v);
  return db;
}

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
