import { Router } from "express";
import { db } from "../db/client";
import { requireAuth, signToken, Role } from "../middleware/auth";

const router = Router();

function getDemoUser() {
  return db.prepare("SELECT * FROM users WHERE id = ?").get("demo-user") as
    | { id: string; name: string; initials: string; roles: string }
    | undefined;
}

function serialize(user: { id: string; name: string; initials: string; roles: string }, activeRole: Role) {
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    roles: JSON.parse(user.roles) as Role[],
    activeRole,
  };
}

router.post("/login", (req, res) => {
  const { role } = req.body as { role?: Role };
  const user = getDemoUser();
  if (!user) return res.status(500).json({ error: "No demo user seeded" });
  const roles: Role[] = JSON.parse(user.roles);
  const activeRole = role && roles.includes(role) ? role : roles[0];
  const token = signToken(user.id, activeRole);
  res.json({ token, user: serialize(user, activeRole) });
});

router.post("/switch-role", requireAuth, (req, res) => {
  const { role } = req.body as { role?: Role };
  const user = getDemoUser();
  if (!user) return res.status(500).json({ error: "No demo user seeded" });
  const roles: Role[] = JSON.parse(user.roles);
  if (!role || !roles.includes(role)) return res.status(400).json({ error: "Unknown role" });
  const token = signToken(user.id, role);
  res.json({ token, user: serialize(user, role) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
