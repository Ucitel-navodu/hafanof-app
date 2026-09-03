import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { requireAuth } from "../middleware/auth";

const router = Router();

function dogFacts(d: any, lang: "cs" | "en") {
  if (lang === "cs") {
    return [
      { k: "Dočasná péče", v: d.foster_name ? `${d.foster_name} · Litvínov` : "hledáme" },
      { k: "V azylu od", v: d.in_care_since },
      { k: "Čip", v: d.chip },
      { k: "Kastrace", v: d.neutered },
    ];
  }
  return [
    { k: "Foster carer", v: d.foster_name ? `${d.foster_name} · Litvínov` : "looking" },
    { k: "In care since", v: d.in_care_since },
    { k: "Chip", v: d.chip },
    { k: "Neutered", v: d.neutered },
  ];
}

function dogHealth(d: any, lang: "cs" | "en") {
  if (lang === "cs") {
    return [
      { k: "Očkování (vzteklina, DHPPi)", v: d.vaccination },
      { k: "Odčervení", v: d.deworming },
      { k: "Poslední kontrola", v: d.last_checkup },
      { k: "Veterinář", v: d.vet },
    ];
  }
  return [
    { k: "Vaccination (rabies, DHPPi)", v: d.vaccination },
    { k: "Deworming", v: d.deworming },
    { k: "Last check-up", v: d.last_checkup },
    { k: "Vet", v: d.vet },
  ];
}

router.get("/", requireAuth, (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = status && status !== "Vše"
    ? db.prepare("SELECT * FROM dogs WHERE status = ? ORDER BY name").all(status)
    : db.prepare("SELECT * FROM dogs ORDER BY name").all();
  res.json({ dogs: rows });
});

router.get("/:id", requireAuth, (req, res) => {
  const lang = (req.query.lang as "cs" | "en") || "cs";
  const dog = db.prepare("SELECT * FROM dogs WHERE id = ?").get(req.params.id) as any;
  if (!dog) return res.status(404).json({ error: "Dog not found" });

  const meds = db.prepare("SELECT * FROM medications WHERE dog_id = ?").all(dog.id);
  const diary = db.prepare("SELECT * FROM diary_entries WHERE dog_id = ? ORDER BY created_at DESC").all(dog.id) as any[];
  const applications = db.prepare("SELECT * FROM adoption_applications WHERE dog_id = ? ORDER BY created_at DESC").all(dog.id);

  res.json({
    dog,
    facts: dogFacts(dog, lang),
    health: dogHealth(dog, lang),
    medications: meds,
    diary: diary.map((e) => ({ ...e, checks: JSON.parse(e.checks) })),
    applications,
    lookingFor: lang === "cs" ? dog.looking_for_cs : dog.looking_for_en,
    description: lang === "cs" ? dog.description_cs : dog.description_en,
  });
});

router.patch("/:id/hero-photo", requireAuth, (req, res) => {
  if (req.user!.activeRole !== "coordinator" && req.user!.activeRole !== "foster") {
    return res.status(403).json({ error: "Coordinator or foster role required" });
  }
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: "Missing url" });
  const info = db.prepare("UPDATE dogs SET hero_photo = ? WHERE id = ?").run(url, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Dog not found" });
  res.json({ ok: true, hero_photo: url });
});

router.get("/:id/diary", requireAuth, (req, res) => {
  const diary = db.prepare("SELECT * FROM diary_entries WHERE dog_id = ? ORDER BY created_at DESC").all(req.params.id) as any[];
  res.json({ diary: diary.map((e) => ({ ...e, checks: JSON.parse(e.checks) })) });
});

router.post("/:id/diary", requireAuth, (req, res) => {
  if (req.user!.activeRole !== "foster") return res.status(403).json({ error: "Foster role required" });
  const { mood, checks, note } = req.body as { mood: string; checks: Record<string, boolean>; note?: string };
  const dog = db.prepare("SELECT * FROM dogs WHERE id = ?").get(req.params.id);
  if (!dog) return res.status(404).json({ error: "Dog not found" });

  const now = new Date();
  const entry = {
    id: randomUUID(),
    dog_id: req.params.id,
    author: req.user!.name,
    date_label: `${now.getDate()}. ${now.getMonth() + 1}.`,
    mood,
    checks: JSON.stringify(checks || {}),
    note: note || "",
    created_at: now.toISOString(),
  };
  db.prepare(
    `INSERT INTO diary_entries (id,dog_id,author,date_label,mood,checks,note,created_at) VALUES (@id,@dog_id,@author,@date_label,@mood,@checks,@note,@created_at)`
  ).run(entry);
  res.status(201).json({ entry: { ...entry, checks: JSON.parse(entry.checks) } });
});

export default router;
