import { db } from "./client";

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      roles TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dogs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sex TEXT NOT NULL,
      age_label TEXT NOT NULL,
      breed TEXT NOT NULL,
      weight_kg INTEGER,
      status TEXT NOT NULL,
      foster_name TEXT,
      in_care_since TEXT,
      chip TEXT,
      neutered TEXT,
      vet TEXT,
      vaccination TEXT,
      deworming TEXT,
      last_checkup TEXT,
      looking_for_cs TEXT,
      looking_for_en TEXT,
      description_cs TEXT,
      description_en TEXT,
      tags TEXT,
      hero_photo TEXT,
      ready_to_adopt INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meta TEXT NOT NULL,
      time_label TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      day INTEGER NOT NULL,
      time_label TEXT NOT NULL,
      title TEXT NOT NULL,
      meta TEXT NOT NULL,
      who TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      drug TEXT NOT NULL,
      days_left INTEGER NOT NULL,
      pct INTEGER NOT NULL,
      urgent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      author TEXT NOT NULL,
      date_label TEXT NOT NULL,
      mood TEXT NOT NULL,
      checks TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_queue (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      author TEXT NOT NULL,
      story TEXT NOT NULL,
      photos TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      title TEXT NOT NULL,
      for_label TEXT NOT NULL,
      goal_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      wish_id TEXT NOT NULL REFERENCES wishes(id),
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patronages (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      monthly_amount INTEGER NOT NULL,
      given_total INTEGER NOT NULL,
      since_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS patron_updates (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      date_label TEXT NOT NULL,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS adoption_applications (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL REFERENCES dogs(id),
      applicant_name TEXT NOT NULL,
      housing TEXT,
      household TEXT,
      why TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);
}
