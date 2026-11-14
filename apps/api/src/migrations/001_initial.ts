import type { Migration } from "../modules/types";

/** Výchozí schéma milníku 1 (evidence psů, zdraví, dokumenty, osoby, adopce, DP, úkoly, audit). */
export const m001: Migration = {
  id: 1,
  name: "initial",
  up: (db) => db.exec(SQL),
};

const SQL = `
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
