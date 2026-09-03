import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

function requireAdopter(req: any, res: any, next: any) {
  if (req.user.activeRole !== "adopter") return res.status(403).json({ error: "Adopter role required" });
  next();
}

router.use(requireAuth, requireAdopter);

router.get("/browse", (req, res) => {
  const featured = db.prepare("SELECT * FROM dogs WHERE ready_to_adopt = 1 ORDER BY rowid LIMIT 1").get() as any;
  const more = db
    .prepare("SELECT * FROM dogs WHERE id != ? ORDER BY rowid LIMIT 3")
    .all(featured ? featured.id : "");
  res.json({ featured, more });
});

router.post("/applications", (req, res) => {
  const { dogId, housing, household, why, terms } = req.body as {
    dogId: string;
    housing: string;
    household: Record<string, boolean>;
    why: string;
    terms: boolean;
  };
  if (!terms) return res.status(400).json({ error: "Terms must be accepted" });
  const dog = db.prepare("SELECT * FROM dogs WHERE id = ?").get(dogId);
  if (!dog) return res.status(404).json({ error: "Dog not found" });

  const application = {
    id: randomUUID(),
    dog_id: dogId,
    applicant_name: req.user!.name,
    housing,
    household: JSON.stringify(household || {}),
    why,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO adoption_applications (id,dog_id,applicant_name,housing,household,why,status,created_at) VALUES (@id,@dog_id,@applicant_name,@housing,@household,@why,@status,@created_at)`
  ).run(application);
  res.status(201).json({ application: { ...application, household: JSON.parse(application.household) } });
});

export default router;
