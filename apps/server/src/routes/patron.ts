import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

function requirePatron(req: any, res: any, next: any) {
  if (req.user.activeRole !== "patron") return res.status(403).json({ error: "Patron role required" });
  next();
}

router.get("/wishes", requireAuth, (req, res) => {
  const rows = db
    .prepare(`SELECT wishes.*, dogs.name as dog_name FROM wishes JOIN dogs ON dogs.id = wishes.dog_id ORDER BY wishes.rowid`)
    .all();
  res.json({ wishes: rows });
});

router.get("/wishes/:id", requireAuth, (req, res) => {
  const wish = db
    .prepare(`SELECT wishes.*, dogs.name as dog_name FROM wishes JOIN dogs ON dogs.id = wishes.dog_id WHERE wishes.id = ?`)
    .get(req.params.id);
  if (!wish) return res.status(404).json({ error: "Wish not found" });
  res.json({ wish });
});

router.post("/wishes/:id/donate", requireAuth, (req, res) => {
  const { amount, method } = req.body as { amount: number; method: string };
  const wish = db.prepare("SELECT * FROM wishes WHERE id = ?").get(req.params.id) as any;
  if (!wish) return res.status(404).json({ error: "Wish not found" });
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  db.prepare(`INSERT INTO donations (id,wish_id,amount,method,created_at) VALUES (?,?,?,?,?)`).run(
    randomUUID(),
    wish.id,
    amount,
    method || "card",
    new Date().toISOString()
  );
  db.prepare("UPDATE wishes SET current_amount = current_amount + ? WHERE id = ?").run(amount, wish.id);
  const updated = db.prepare("SELECT * FROM wishes WHERE id = ?").get(wish.id);
  res.status(201).json({ wish: updated });
});

router.get("/me", requireAuth, requirePatron, (req, res) => {
  const patronage = db
    .prepare(`SELECT patronages.*, dogs.name as dog_name FROM patronages JOIN dogs ON dogs.id = patronages.dog_id LIMIT 1`)
    .get() as any;
  const updates = patronage
    ? db.prepare("SELECT * FROM patron_updates WHERE dog_id = ? ORDER BY rowid DESC").all(patronage.dog_id)
    : [];
  res.json({ patronage, updates });
});

router.post("/amount", requireAuth, requirePatron, (req, res) => {
  const { amount } = req.body as { amount: number };
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
  const patronage = db.prepare("SELECT * FROM patronages LIMIT 1").get() as any;
  if (!patronage) return res.status(404).json({ error: "No patronage found" });
  db.prepare("UPDATE patronages SET monthly_amount = ? WHERE id = ?").run(amount, patronage.id);
  res.json({ patronage: db.prepare("SELECT * FROM patronages WHERE id = ?").get(patronage.id) });
});

export default router;
