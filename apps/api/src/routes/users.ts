import { Router } from "express";
import type { DB } from "../db";
import { HttpError, ROLES, hashPassword, requireLevel } from "../auth";
import { createAudited, requireFields, updateAudited } from "../audit";
import { h, intParam } from "./util";

type Row = Record<string, unknown>;

export function userRoutes(db: DB) {
  const r = Router();
  const pub = (u: Row) => ({ id: u.id, email: u.email, name: u.name, roles: JSON.parse(String(u.roles)), person_id: u.person_id, active: !!u.active, created_at: u.created_at });

  /** Seznam jmen pro přiřazení úkolů — bez citlivých údajů. */
  r.get(
    "/lookup",
    h((req, res) => {
      requireLevel(req, "tasks", "read");
      res.json(db.prepare("SELECT id, name FROM users WHERE active = 1 ORDER BY name").all());
    }),
  );

  r.get(
    "/",
    h((req, res) => {
      requireLevel(req, "users", "read");
      res.json((db.prepare("SELECT * FROM users ORDER BY name").all() as Row[]).map(pub));
    }),
  );

  const validateRoles = (roles: unknown) => {
    if (!Array.isArray(roles) || roles.some((x) => !(ROLES as readonly string[]).includes(x))) throw new HttpError(400, "Neplatné role");
    return JSON.stringify(roles);
  };

  r.post(
    "/",
    h((req, res) => {
      requireLevel(req, "users", "write");
      requireFields(req.body, ["email", "name", "password"]);
      if (String(req.body.password).length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
      const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(String(req.body.email).trim().toLowerCase());
      if (exists) throw new HttpError(409, "Uživatel s tímto e-mailem už existuje");
      const u = createAudited(db, req.user, "users", {
        email: String(req.body.email).trim().toLowerCase(),
        name: String(req.body.name),
        password_hash: hashPassword(String(req.body.password)),
        roles: validateRoles(req.body.roles ?? []),
        person_id: req.body.person_id ? Number(req.body.person_id) : null,
      });
      res.status(201).json(pub(u));
    }),
  );

  r.patch(
    "/:id",
    h((req, res) => {
      const id = intParam(req);
      requireLevel(req, "users", "write");
      const patch: Record<string, string | number | null> = {};
      if (req.body.name !== undefined) patch.name = String(req.body.name);
      if (req.body.roles !== undefined) patch.roles = validateRoles(req.body.roles);
      if (req.body.active !== undefined) patch.active = req.body.active ? 1 : 0;
      if (req.body.person_id !== undefined) patch.person_id = req.body.person_id ? Number(req.body.person_id) : null;
      if (req.body.password) {
        if (String(req.body.password).length < 10) throw new HttpError(400, "Heslo musí mít alespoň 10 znaků");
        patch.password_hash = hashPassword(String(req.body.password));
      }
      if (id === req.user!.id && (patch.active === 0 || (patch.roles && !JSON.parse(String(patch.roles)).includes("admin"))))
        throw new HttpError(400, "Nelze odebrat administrátorská práva sám sobě");
      const { after } = updateAudited(db, req.user, "users", id, patch);
      if (patch.active === 0 || patch.password_hash) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
      res.json(pub(after));
    }),
  );
  return r;
}
