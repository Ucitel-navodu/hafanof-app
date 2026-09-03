import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, (req, res) => {
  if (req.user!.activeRole !== "foster") return res.status(403).json({ error: "Foster role required" });
  const { dogId, photos, story, tags } = req.body as { dogId: string; photos: string[]; story: string; tags: string[] };
  const dog = db.prepare("SELECT * FROM dogs WHERE id = ?").get(dogId);
  if (!dog) return res.status(404).json({ error: "Dog not found" });

  const entry = {
    id: randomUUID(),
    dog_id: dogId,
    author: `${req.user!.name} · dnes`,
    story,
    photos: JSON.stringify(photos || []),
    tags: JSON.stringify(tags || []),
    status: "pending",
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO approval_queue (id,dog_id,author,story,photos,tags,status,created_at) VALUES (@id,@dog_id,@author,@story,@photos,@tags,@status,@created_at)`
  ).run(entry);
  res.status(201).json({ entry: { ...entry, photos: JSON.parse(entry.photos), tags: JSON.parse(entry.tags) } });
});

export default router;
