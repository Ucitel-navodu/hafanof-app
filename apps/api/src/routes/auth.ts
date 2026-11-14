import { Router } from "express";
import type { DB } from "../db";
import {
  HttpError,
  LoginLimiter,
  SESSION_COOKIE,
  createSession,
  destroySession,
  hashPassword,
  permissionsOf,
  readCookie,
  requireUser,
  verifyPassword,
} from "../auth";
import { audit, getRow, updateAudited } from "../audit";
import type { Paths } from "../modules/types";
import { h } from "./util";

type Row = Record<string, unknown>;

export function authRoutes(db: DB, paths: Paths) {
  const r = Router();
  const limiter = new LoginLimiter();
  r.post(
    "/login",
    h((req, res) => {
      const email = String(req.body.email ?? "").trim().toLowerCase();
      const password = String(req.body.password ?? "");
      const key = `${email}|${req.ip}`;
      if (!limiter.allowed(key)) throw new HttpError(429, "Příliš mnoho pokusů, zkuste to za 15 minut");
      const u = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as Row | undefined;
      if (!u || !verifyPassword(password, String(u.password_hash))) {
        limiter.failed(key);
        throw new HttpError(401, "Neplatný e-mail nebo heslo");
      }
      limiter.succeeded(key);
      const token = createSession(db, u.id as number);
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: paths.secureCookies,
        maxAge: 30 * 864e5,
        path: "/",
      });
      const user = { id: u.id as number, email: String(u.email), name: String(u.name), roles: JSON.parse(String(u.roles)), person_id: (u.person_id as number) ?? null };
      audit(db, user, "login", "users", user.id);
      res.json({ ...user, permissions: permissionsOf(user) });
    }),
  );
  r.post(
    "/logout",
    h((req, res) => {
      const token = readCookie(req, SESSION_COOKIE);
      if (token) destroySession(db, token);
      if (req.user) audit(db, req.user, "logout", "users", req.user.id);
      res.clearCookie(SESSION_COOKIE, { path: "/" });
      res.json({ ok: true });
    }),
  );
  r.get(
    "/me",
    h((req, res) => {
      const user = requireUser(req);
      res.json({ ...user, permissions: permissionsOf(user) });
    }),
  );
  r.post(
    "/password",
    h((req, res) => {
      const user = requireUser(req);
      const u = getRow(db, "users", user.id);
      if (!verifyPassword(String(req.body.current ?? ""), String(u.password_hash))) throw new HttpError(400, "Současné heslo nesouhlasí");
      const next = String(req.body.next ?? "");
      if (next.length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
      updateAudited(db, user, "users", user.id, { password_hash: hashPassword(next) });
      audit(db, user, "update", "users", user.id, { extra: { password: ["***", "***"] } });
      res.json({ ok: true });
    }),
  );
  return r;
}
