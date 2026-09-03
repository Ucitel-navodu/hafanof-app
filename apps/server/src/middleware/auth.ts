import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/client";

export const JWT_SECRET = process.env.JWT_SECRET || "hafanof-dev-secret-change-me";

export type Role = "coordinator" | "foster" | "patron" | "adopter";

export interface AuthUser {
  id: string;
  name: string;
  initials: string;
  roles: Role[];
  activeRole: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string, activeRole: Role) {
  return jwt.sign({ sub: userId, role: activeRole }, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string; role: Role };
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub) as
      | { id: string; name: string; initials: string; roles: string }
      | undefined;
    if (!row) return res.status(401).json({ error: "Unknown user" });
    req.user = {
      id: row.id,
      name: row.name,
      initials: row.initials,
      roles: JSON.parse(row.roles),
      activeRole: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
