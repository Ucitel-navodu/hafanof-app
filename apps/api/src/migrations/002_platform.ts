import type { Migration } from "../modules/types";

/** Platforma: běhy naplánovaných úloh; osoby mohou být i organizace; dokumenty navázané na záznamy modulů. */
export const m002: Migration = {
  id: 2,
  name: "platform",
  up: (db) => {
    db.exec(`
      CREATE TABLE job_runs (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        run_key TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        finished_at TEXT,
        status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error')),
        message TEXT,
        UNIQUE (name, run_key)
      );
      ALTER TABLE people ADD COLUMN kind TEXT NOT NULL DEFAULT 'person';
      ALTER TABLE people ADD COLUMN ico TEXT;
      ALTER TABLE people ADD COLUMN dic TEXT;
      ALTER TABLE people ADD COLUMN contact_person TEXT;
      -- Obecné navázání dokumentu na záznam modulu (účtenka, zápis z valné hromady…).
      ALTER TABLE documents ADD COLUMN ref_type TEXT;
      ALTER TABLE documents ADD COLUMN ref_id INTEGER;
      CREATE INDEX documents_ref ON documents(ref_type, ref_id);
    `);
  },
};
