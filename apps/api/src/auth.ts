import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { DB } from "./db";

/** Role ve verzi 1.0 (sekce 2). Veterinář a adoptující portál jsou 🟢 — zatím ne. */
export const ROLES = ["admin", "director", "auditor", "team", "foster", "volunteer"] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  "dogs",
  "health",
  "documents",
  "people",
  "adoptions",
  "foster",
  "tasks",
  "stats",
  "audit",
  "users",
  "backup",
] as const;
export type Module = (typeof MODULES)[number];

/**
 * none  — modul není vidět
 * basic — jen nezbytné údaje (dobrovolník u psů)
 * own   — jen vlastní záznamy (dočaskář: svěřenci, dobrovolník: vlastní úkoly)
 * read  — čtení všeho
 * write — čtení i zápis
 */
export type Level = "none" | "basic" | "own" | "read" | "write";
const ORDER: Level[] = ["none", "basic", "own", "read", "write"];

type Matrix = Record<Role, Partial<Record<Module, Level>>>;

const ALL_WRITE = Object.fromEntries(MODULES.map((m) => [m, "write"])) as Record<Module, Level>;

export const PERMISSIONS: Matrix = {
  admin: ALL_WRITE,
  director: { ...ALL_WRITE, users: "read", backup: "none" },
  auditor: {
    dogs: "read",
    health: "read",
    documents: "read",
    people: "read",
    adoptions: "read",
    foster: "read",
    tasks: "read",
    stats: "read",
    audit: "read",
    users: "read",
  },
  team: {
    dogs: "write",
    health: "write",
    documents: "write",
    people: "write",
    adoptions: "write",
    foster: "write",
    tasks: "write",
    stats: "read",
  },
  foster: { dogs: "own", health: "own", documents: "own", tasks: "own" },
  volunteer: { dogs: "basic", tasks: "own" },
};

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  person_id: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function level(user: AuthUser, module: Module): Level {
  let best: Level = "none";
  for (const r of user.roles) {
    const l = PERMISSIONS[r]?.[module] ?? "none";
    if (ORDER.indexOf(l) > ORDER.indexOf(best)) best = l;
  }
  return best;
}

export function atLeast(l: Level, min: Level) {
  return ORDER.indexOf(l) >= ORDER.indexOf(min);
}

export function permissionsOf(user: AuthUser) {
  return Object.fromEntries(MODULES.map((m) => [m, level(user, m)])) as Record<Module, Level>;
}

// ── Hesla ──────────────────────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// ── Relace ─────────────────────────────────────────────────────────────
export const SESSION_COOKIE = "hf_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createSession(db: DB, userId: number): string {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  db.prepare("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expires);
  return token;
}

export function destroySession(db: DB, token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Načte uživatele z relace při KAŽDÉM požadavku přímo z databáze — odebrání role
 * nebo deaktivace účtu se tak projeví okamžitě (sekce 24).
 */
export function loadUser(db: DB) {
  const stmt = db.prepare(
    `SELECT u.id, u.email, u.name, u.roles, u.person_id FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
  );
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      const row = stmt.get(sha256(token), new Date().toISOString()) as
        | { id: number; email: string; name: string; roles: string; person_id: number | null }
        | undefined;
      if (row) req.user = { ...row, roles: JSON.parse(row.roles) as Role[] };
    }
    next();
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, "Nepřihlášen");
  return req.user;
}

/** Ověří oprávnění na serveru a vrátí úroveň přístupu. */
export function requireLevel(req: Request, module: Module, min: Level): Level {
  const user = requireUser(req);
  const l = level(user, module);
  if (!atLeast(l, min)) throw new HttpError(403, "Nedostatečné oprávnění");
  return l;
}

/** Psi aktuálně svěření dočaskáři (podle navázané osoby). */
export function fosterDogIds(db: DB, user: AuthUser): number[] {
  if (!user.person_id) return [];
  const rows = db
    .prepare("SELECT DISTINCT dog_id FROM placements WHERE person_id = ? AND end_date IS NULL")
    .all(user.person_id) as { dog_id: number }[];
  return rows.map((r) => r.dog_id);
}

/** Smí uživatel pracovat s daným psem v daném modulu? Vrací úroveň nebo vyhodí 403/404. */
export function requireDogAccess(db: DB, req: Request, module: Module, dogId: number, min: Level): Level {
  const user = requireUser(req);
  const l = level(user, module);
  if (l === "own") {
    if (!fosterDogIds(db, user).includes(dogId)) throw new HttpError(404, "Pes nenalezen");
    // "own" smí číst i zapisovat vybrané věci (váha, poznámka, foto) — rozhoduje route.
    return l;
  }
  if (!atLeast(l, min)) throw new HttpError(403, "Nedostatečné oprávnění");
  return l;
}

// ── Omezení pokusů o přihlášení (klíč = e-mail + IP, takže útočník nezablokuje oběť z jiné adresy) ──
export class LoginLimiter {
  private attempts = new Map<string, { count: number; first: number }>();
  constructor(
    private max = 10,
    private windowMs = 15 * 60_000,
  ) {}
  allowed(key: string): boolean {
    const a = this.attempts.get(key);
    if (!a || Date.now() - a.first > this.windowMs) return true;
    return a.count < this.max;
  }
  failed(key: string) {
    const a = this.attempts.get(key);
    if (!a || Date.now() - a.first > this.windowMs) this.attempts.set(key, { count: 1, first: Date.now() });
    else a.count++;
  }
  succeeded(key: string) {
    this.attempts.delete(key);
  }
}
