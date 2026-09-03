import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

// The demo foster carer's assigned dog (single-demo-user prototype).
const MY_DOG_ID = "shebby";

function requireFoster(req: any, res: any, next: any) {
  if (req.user.activeRole !== "foster") return res.status(403).json({ error: "Foster role required" });
  next();
}

router.use(requireAuth, requireFoster);

router.get("/home", (req, res) => {
  const dog = db.prepare("SELECT * FROM dogs WHERE id = ?").get(MY_DOG_ID) as any;
  const med = db.prepare("SELECT * FROM medications WHERE dog_id = ? ORDER BY days_left LIMIT 1").get(MY_DOG_ID);
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = db
    .prepare("SELECT * FROM diary_entries WHERE dog_id = ? AND created_at LIKE ? ORDER BY created_at DESC LIMIT 1")
    .get(MY_DOG_ID, `${today}%`) as any;
  const wishes = db.prepare("SELECT * FROM wishes WHERE dog_id = ?").all(MY_DOG_ID);

  res.json({
    dog,
    med,
    todayChecks: todayEntry ? JSON.parse(todayEntry.checks) : {},
    wishes,
  });
});

export default router;
