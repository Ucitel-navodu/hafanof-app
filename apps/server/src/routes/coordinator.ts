import { Router } from "express";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

function requireCoordinator(req: any, res: any, next: any) {
  if (req.user.activeRole !== "coordinator") return res.status(403).json({ error: "Coordinator role required" });
  next();
}

router.use(requireAuth, requireCoordinator);

router.get("/dashboard", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY rowid").all();
  const fosterCount = (db.prepare("SELECT COUNT(*) c FROM dogs WHERE status = 'V dočasce'").get() as any).c;
  const needCount = (db.prepare("SELECT COUNT(*) c FROM dogs WHERE status = 'Hledá DP'").get() as any).c;
  const appCount = (db.prepare("SELECT COUNT(*) c FROM adoption_applications WHERE status = 'pending'").get() as any).c;
  const pendingApprovals = (db.prepare("SELECT COUNT(*) c FROM approval_queue WHERE status = 'pending'").get() as any).c;

  res.json({
    tasks,
    stats: { fosterCount, needCount, appCount },
    pendingApprovals,
    mission: { title: "Stavíme nový Hafanof", raised: 412000, goal: 1500000 },
  });
});

router.patch("/tasks/:id", (req, res) => {
  const { done } = req.body as { done: boolean };
  const info = db.prepare("UPDATE tasks SET done = ? WHERE id = ?").run(done ? 1 : 0, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

router.get("/calendar", (req, res) => {
  const day = req.query.day ? Number(req.query.day) : 3;
  const appts = db.prepare("SELECT * FROM appointments WHERE day = ? ORDER BY time_label").all(day);
  const meds = db
    .prepare(
      `SELECT medications.*, dogs.name as dog_name FROM medications JOIN dogs ON dogs.id = medications.dog_id`
    )
    .all();
  res.json({ appointments: appts, medications: meds });
});

router.get("/approvals", (req, res) => {
  const rows = db
    .prepare(
      `SELECT approval_queue.*, dogs.name as dog_name FROM approval_queue JOIN dogs ON dogs.id = approval_queue.dog_id ORDER BY approval_queue.created_at DESC`
    )
    .all() as any[];
  res.json({ queue: rows.map((r) => ({ ...r, photos: JSON.parse(r.photos), tags: JSON.parse(r.tags) })) });
});

router.post("/approvals/:id/approve", (req, res) => {
  const info = db.prepare("UPDATE approval_queue SET status = 'approved' WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

router.post("/approvals/:id/reject", (req, res) => {
  const info = db.prepare("UPDATE approval_queue SET status = 'rejected' WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
