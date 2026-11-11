/**
 * Akceptační scénáře z funkčního zadání 1.0:
 *  - sekce 23: pes od příjmu po adopci
 *  - sekce 24: oprávnění
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { Client, fileForm, seedUser, startTestServer, type TestEnv } from "./helpers";
import { createBackup, restoreBackup } from "../src/backup";
import { addDays, today } from "../src/audit";

const YEAR = today().slice(0, 4);

let env: TestEnv;
let admin: Client;
let team: Client;
const ids: Record<string, number> = {};

before(async () => {
  env = await startTestServer();
  seedUser(env.db, "admin@test.cz", "Admin", ["admin"]);
  admin = new Client(env.base);
  await admin.login("admin@test.cz");
  await admin.post("/api/users", { email: "tym@test.cz", name: "Terka Týmová", password: "heslo-pro-testy", roles: ["team"] });
  team = new Client(env.base);
  await team.login("tym@test.cz");
});
after(() => env.close());

describe("Sekce 23 – pes od příjmu po adopci", () => {
  test("založit psa a získat automatické evidenční číslo", async () => {
    const dog = await team.post("/api/dogs", {
      name: "Shebby",
      sex: "female",
      intake_date: today(),
      intake_type: "Odebrání",
      intake_origin: "Obec Lhota",
      intake_health: "Podvyživená, zánět ucha",
    });
    assert.equal(dog.reg_number, `HAF-${YEAR}-0001`);
    assert.equal(dog.status, "new");
    ids.dog = dog.id;
    const second = await team.post("/api/dogs", { name: "Bára", intake_date: today() });
    assert.equal(second.reg_number, `HAF-${YEAR}-0002`);
    ids.dog2 = second.id;
  });

  test("doplnit čip, základní údaje a dokumentaci k přijetí", async () => {
    const dog = await team.patch(`/api/dogs/${ids.dog}`, {
      chip: "203098100123456",
      breed: "Kříženec",
      color: "černobílá",
      birth_date: "2022-05-01",
      birth_estimated: true,
      status: "in_care",
      location: "Hafanof – kotec 2",
    });
    assert.equal(dog.chip, "203098100123456");
    assert.equal(dog.birth_estimated, 1);
    const doc = await team.post(
      "/api/documents",
      fileForm({ dog_id: String(ids.dog), category: "intake", title: "Předávací protokol obce" }, "protokol.pdf", "application/pdf"),
    );
    assert.equal(doc.category, "intake");
    const file = await team.raw("GET", doc.url);
    assert.equal(file.status, 200);
    assert.match(String(file.body), /%PDF/);
  });

  test("zapsat veterinární návštěvu, nahrát zprávu a naplánovat kontrolu", async () => {
    const report = await team.post(
      "/api/documents",
      fileForm({ dog_id: String(ids.dog), category: "veterinary", title: "Zpráva MVDr. Novák" }, "zprava.pdf", "application/pdf"),
    );
    const checkDate = addDays(today(), 7);
    const visit = await team.post(`/api/dogs/${ids.dog}/health`, {
      kind: "vet_visit",
      date: today(),
      clinic: "Veterina Lhota",
      vet: "MVDr. Novák",
      reason: "Vstupní prohlídka",
      conclusion: "Otitis externa, léčba kapkami",
      next_due: checkDate,
      document_id: report.id,
    });
    assert.equal(visit.next_due, checkDate);
    await team.post(`/api/dogs/${ids.dog}/medications`, { name: "Otomax", dose: "5 kapek", frequency: "2× denně", start_date: today(), end_date: checkDate });
    await team.post(`/api/dogs/${ids.dog}/weights`, { date: today(), kg: 14.2 });
    const cal = await team.get(`/api/calendar?from=${today()}&to=${addDays(today(), 14)}`);
    assert.ok(cal.some((i: any) => i.type === "health" && i.date === checkDate && i.dog_id === ids.dog), "kontrola je v kalendáři");
    const dash = await team.get("/api/dashboard");
    assert.ok(dash.health_upcoming.some((i: any) => i.dog_id === ids.dog), "kontrola je na nástěnce");
    assert.equal(dash.medications_active.length, 1);
  });

  test("přesunout psa do dočasné péče a evidovat předané vybavení", async () => {
    const foster = await team.post("/api/people", {
      first_name: "Dana",
      last_name: "Dočasná",
      phone: "+420 777 111 222",
      email: "dana@example.cz",
      roles: ["foster"],
      foster_capacity: 2,
    });
    ids.fosterPerson = foster.id;
    const pl = await team.post("/api/placements", {
      dog_id: ids.dog,
      person_id: foster.id,
      start_date: today(),
      items: [
        { item: "Postroj M", quantity: "1" },
        { item: "Granule Brit 3 kg", quantity: "1" },
      ],
    });
    ids.placement = pl.id;
    const dog = await team.get(`/api/dogs/${ids.dog}`);
    assert.equal(dog.status, "foster");
    assert.equal(dog.current_placement.person_id, foster.id);
    const list = await team.get(`/api/placements?dog_id=${ids.dog}`);
    assert.equal(list[0].items.length, 2);
  });

  test("označit psa k adopci a přidat více zájemců", async () => {
    await team.patch(`/api/dogs/${ids.dog}`, { status: "for_adoption" });
    const a = await team.post("/api/people", { first_name: "Adam", last_name: "Adoptující", email: "adam@example.cz" });
    const b = await team.post("/api/people", { first_name: "Běla", last_name: "Zájemkyně", phone: "603 123 456" });
    ids.personA = a.id;
    ids.personB = b.id;
    const appA = await team.post("/api/adoptions", { dog_id: ids.dog, person_id: a.id, questionnaire: "Byt 3+1, zahrada u rodičů" });
    const appB = await team.post("/api/adoptions", { dog_id: ids.dog, person_id: b.id });
    ids.appA = appA.id;
    ids.appB = appB.id;
    const apps = await team.get(`/api/adoptions?dog_id=${ids.dog}`);
    assert.equal(apps.length, 2);
    const person = await team.get(`/api/people/${a.id}`);
    assert.ok(person.roles.includes("adopter"), "osoba získala roli adoptující");
  });

  test("evidovat komunikaci, návštěvu, schválení a rezervaci", async () => {
    await team.post(`/api/people/${ids.personA}/communications`, {
      adoption_id: ids.appA,
      dog_id: ids.dog,
      channel: "telefon",
      summary: "Domluvena návštěva v sobotu",
    });
    await team.patch(`/api/adoptions/${ids.appA}`, { status: "contacted" });
    const visitAt = addDays(today(), 2);
    await team.patch(`/api/adoptions/${ids.appA}`, { status: "visit", visit_at: visitAt });
    const cal = await team.get(`/api/calendar?from=${today()}&to=${addDays(today(), 5)}`);
    assert.ok(cal.some((i: any) => i.type === "visit" && i.date === visitAt), "návštěva je v kalendáři");
    await team.patch(`/api/adoptions/${ids.appA}`, { status: "approved" });

    const noReason = await team.raw("PATCH", `/api/adoptions/${ids.appB}`, { status: "rejected" });
    assert.equal(noReason.status, 400, "zamítnutí bez důvodu neprojde");
    await team.patch(`/api/adoptions/${ids.appB}`, { status: "rejected", rejection_reason: "Nevhodné podmínky – malý byt bez výběhu" });

    await team.patch(`/api/adoptions/${ids.appA}`, { status: "reserved" });
    let dog = await team.get(`/api/dogs/${ids.dog}`);
    assert.equal(dog.status, "reserved");

    // Druhá rezervace téhož psa je zakázaná.
    const c = await team.post("/api/people", { first_name: "Cyril" });
    const appC = await team.post("/api/adoptions", { dog_id: ids.dog, person_id: c.id });
    const dup = await team.raw("PATCH", `/api/adoptions/${appC.id}`, { status: "reserved" });
    assert.equal(dup.status, 409);
    await team.patch(`/api/adoptions/${appC.id}`, { status: "withdrawn" });
    dog = await team.get(`/api/dogs/${ids.dog}`);
    assert.equal(dog.status, "reserved");
  });

  test("vytvořit/doplnit adopční dokumentaci", async () => {
    const missing = await team.post("/api/documents", fileForm({ dog_id: String(ids.dog), adoption_id: String(ids.appA), category: "adoption", title: "Adopční smlouva", status: "awaiting_signature" }, "smlouva.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    let dash = await team.get("/api/dashboard");
    assert.ok(dash.documents_pending.some((d: any) => d.id === missing.id), "nepodepsaná smlouva je na nástěnce");
    await team.patch(`/api/documents/${missing.id}`, { status: "signed" });
    dash = await team.get("/api/dashboard");
    assert.ok(!dash.documents_pending.some((d: any) => d.id === missing.id));
    const adoption = await team.get(`/api/adoptions/${ids.appA}`);
    assert.equal(adoption.documents.length, 1);
    assert.equal(adoption.communications.length, 1);
  });

  test("změnit psa na adoptovaného, ukončit dny v péči a naplánovat kontroly", async () => {
    const adoptedAt = today();
    await team.patch(`/api/adoptions/${ids.appA}`, { status: "adopted", adopted_at: adoptedAt });
    const dog = await team.get(`/api/dogs/${ids.dog}`);
    assert.equal(dog.status, "adopted");
    assert.equal(dog.end_date, adoptedAt);
    assert.equal(dog.owner_person_id, ids.personA);
    assert.equal(typeof dog.days_in_care, "number");
    assert.equal(dog.current_placement, null, "dočasná péče se ukončila");
    const adoption = await team.get(`/api/adoptions/${ids.appA}`);
    assert.deepEqual(
      adoption.checks.map((t: any) => t.due_date),
      [14, 90, 365].map((d) => addDays(adoptedAt, d)),
    );
  });

  test("správně zahrnout psa do statistik", async () => {
    const s = await admin.get("/api/stats");
    assert.equal(s.intake, 2);
    assert.equal(s.adoptions, 1);
    assert.equal(s.in_care, 1, "Bára je stále v péči");
    assert.equal(s.in_foster, 0);
    assert.equal(s.ended.adopted, 1);
    assert.equal(s.avg_stay_days_ended, 0);
  });

  test("v historii dohledat všechny důležité změny", async () => {
    const log = await admin.get(`/api/audit?dog_id=${ids.dog}&limit=1000`);
    const statusChanges = log.filter((e: any) => e.entity === "dogs" && e.changes.status).map((e: any) => e.changes.status);
    assert.deepEqual(statusChanges.reverse(), [
      ["new", "in_care"],
      ["in_care", "foster"],
      ["foster", "for_adoption"],
      ["for_adoption", "reserved"],
      ["reserved", "adopted"],
    ]);
    const chip = log.find((e: any) => e.entity === "dogs" && e.changes.chip);
    assert.deepEqual(chip.changes.chip, [null, "203098100123456"]);
    assert.equal(chip.user_name, "Terka Týmová");
    assert.ok(log.some((e: any) => e.entity === "documents" && e.action === "create"));
    assert.ok(log.some((e: any) => e.entity === "health_records" && e.action === "create"));
    assert.ok(log.some((e: any) => e.entity === "adoptions" && e.changes.status?.[1] === "adopted"));

    const timeline = await team.get(`/api/dogs/${ids.dog}/timeline`);
    const types = new Set(timeline.map((e: any) => e.type));
    for (const t of ["intake", "health", "foster", "status", "adoption", "document", "move"]) assert.ok(types.has(t), `časová osa obsahuje ${t}`);
  });

  test("auditní historii nelze měnit ani mazat", () => {
    assert.throws(() => env.db.exec("DELETE FROM audit_log"), /append-only/);
    assert.throws(() => env.db.exec("UPDATE audit_log SET user_name = 'x'"), /append-only/);
  });

  test("evidence úmrtí adoptovaného psa", async () => {
    await team.patch(`/api/dogs/${ids.dog}`, { death_date: today() });
    const tl = await team.get(`/api/dogs/${ids.dog}/timeline`);
    assert.ok(tl.some((e: any) => e.type === "death"));
  });
});

describe("Sekce 24 – oprávnění", () => {
  let foster: Client;
  let volunteer: Client;
  let auditor: Client;

  before(async () => {
    // Bára jde do DP k Daně; Dana má účet dočaskáře.
    await team.post("/api/placements", { dog_id: ids.dog2, person_id: ids.fosterPerson, start_date: today() });
    await admin.post("/api/users", { email: "dana@test.cz", name: "Dana", password: "heslo-pro-testy", roles: ["foster"], person_id: ids.fosterPerson });
    await admin.post("/api/users", { email: "dobro@test.cz", name: "Dobrovolník", password: "heslo-pro-testy", roles: ["volunteer"] });
    await admin.post("/api/users", { email: "revizor@test.cz", name: "Revizor", password: "heslo-pro-testy", roles: ["auditor"] });
    foster = new Client(env.base);
    volunteer = new Client(env.base);
    auditor = new Client(env.base);
    await foster.login("dana@test.cz");
    await volunteer.login("dobro@test.cz");
    await auditor.login("revizor@test.cz");
  });

  test("administrátor vidí vše", async () => {
    for (const u of ["/api/users", "/api/audit", "/api/stats", "/api/people", "/api/adoptions", "/api/admin/backups"]) {
      assert.equal((await admin.raw("GET", u)).status, 200, u);
    }
  });

  test("člen týmu vidí pouze povolené moduly", async () => {
    assert.equal((await team.raw("GET", "/api/people")).status, 200);
    assert.equal((await team.raw("GET", "/api/audit")).status, 403);
    assert.equal((await team.raw("GET", "/api/users")).status, 403);
    assert.equal((await team.raw("POST", "/api/admin/backups")).status, 403);
  });

  test("dočaskář vidí pouze svého svěřence a povolené údaje", async () => {
    const dogs = await foster.get("/api/dogs");
    assert.deepEqual(dogs.map((d: any) => d.id), [ids.dog2]);
    assert.equal(dogs[0].intake_origin, undefined, "nevidí původ přijetí");
    assert.equal((await foster.raw("GET", `/api/dogs/${ids.dog}`)).status, 404, "cizího psa nevidí");
    assert.equal((await foster.raw("GET", `/api/dogs/${ids.dog}/health`)).status, 404);
    assert.equal((await foster.raw("GET", `/api/dogs/${ids.dog2}/health`)).status, 200);
    assert.equal((await foster.raw("GET", "/api/people")).status, 403);
    assert.equal((await foster.raw("GET", "/api/adoptions")).status, 403);
    // Smí: váhu, poznámku/problém, fotku.
    await foster.post(`/api/dogs/${ids.dog2}/weights`, { kg: 9.5 });
    await foster.post(`/api/dogs/${ids.dog2}/events`, { type: "problem", title: "Kulhá na levou zadní" });
    const photo = await foster.raw("POST", "/api/documents", fileForm({ dog_id: String(ids.dog2), category: "photo" }, "bara.jpg", "image/jpeg", "jpeg"));
    assert.equal(photo.status, 201);
    const noVet = await foster.raw("POST", "/api/documents", fileForm({ dog_id: String(ids.dog2), category: "adoption" }, "x.pdf", "application/pdf"));
    assert.equal(noVet.status, 403);
    assert.equal((await foster.raw("POST", `/api/dogs/${ids.dog2}/health`, { kind: "vet_visit", date: today() })).status, 403);
    assert.equal((await foster.raw("PATCH", `/api/dogs/${ids.dog2}`, { status: "adopted" })).status, 403);
    assert.equal((await foster.raw("POST", `/api/dogs/${ids.dog}/weights`, { kg: 3 })).status, 404);
    // Nahlášený problém vytvořil úkol pro tým.
    const tasks = await team.get(`/api/tasks?dog_id=${ids.dog2}`);
    assert.ok(tasks.some((t: any) => t.kind === "request" && t.priority === "high"));
  });

  test("dobrovolník nevidí citlivé údaje adoptujících, finance ani zdravotní dokumentaci", async () => {
    const dogs = await volunteer.get("/api/dogs");
    assert.ok(dogs.length >= 2);
    for (const d of dogs) {
      assert.equal(d.chip, undefined);
      assert.equal(d.intake_origin, undefined);
      assert.equal(d.owner_person_id, undefined);
    }
    for (const u of ["/api/people", "/api/adoptions", `/api/dogs/${ids.dog2}/health`, "/api/documents", "/api/stats", "/api/audit"]) {
      assert.equal((await volunteer.raw("GET", u)).status, 403, u);
    }
    const s = await volunteer.get("/api/search?q=Adam");
    assert.deepEqual(s.people, []);
    // Potvrzení splnění vlastního úkolu.
    const users = await admin.get("/api/users");
    const vid = users.find((u: any) => u.email === "dobro@test.cz").id;
    const task = await team.post("/api/tasks", { title: "Venčení Báry", assignee_user_id: vid, due_date: today() });
    const mine = await volunteer.get("/api/tasks");
    assert.deepEqual(mine.map((t: any) => t.id), [task.id]);
    await volunteer.patch(`/api/tasks/${task.id}`, { status: "done" });
    assert.equal((await volunteer.raw("PATCH", `/api/tasks/${task.id}`, { title: "přejmenováno" })).body.title, "Venčení Báry");
  });

  test("kontrolní role má přístup k hospodaření a historii, ale nemění data", async () => {
    assert.equal((await auditor.raw("GET", "/api/audit")).status, 200);
    assert.equal((await auditor.raw("GET", "/api/stats")).status, 200);
    assert.equal((await auditor.raw("POST", "/api/dogs", { name: "X", intake_date: today() })).status, 403);
    assert.equal((await auditor.raw("PATCH", `/api/dogs/${ids.dog2}`, { name: "X" })).status, 403);
  });

  test("odebrání oprávnění se projeví okamžitě", async () => {
    const users = await admin.get("/api/users");
    const tid = users.find((u: any) => u.email === "tym@test.cz").id;
    assert.equal((await team.raw("GET", "/api/people")).status, 200);
    await admin.patch(`/api/users/${tid}`, { roles: ["volunteer"] });
    assert.equal((await team.raw("GET", "/api/people")).status, 403, "bez nového přihlášení");
    await admin.patch(`/api/users/${tid}`, { active: false });
    assert.equal((await team.raw("GET", "/api/auth/me")).status, 401);
  });

  test("zápis bez ochranné hlavičky (CSRF) je odmítnut", async () => {
    const r = await admin.raw("POST", "/api/dogs", { name: "X", intake_date: today() }, { csrf: false });
    assert.equal(r.status, 403);
  });

  test("špatné heslo neprojde a zablokuje se po opakovaných pokusech", async () => {
    const c = new Client(env.base);
    for (let i = 0; i < 10; i++) assert.equal((await c.raw("POST", "/api/auth/login", { email: "admin@test.cz", password: "spatne" })).status, 401);
    assert.equal((await c.raw("POST", "/api/auth/login", { email: "admin@test.cz", password: "spatne" })).status, 429);
  });
});

describe("Zálohování a obnova", () => {
  test("záloha jde obnovit a obsahuje data i soubory", async () => {
    const b = createBackup(env.db, path.join(env.dir, "data", "uploads"), path.join(env.dir, "backups"));
    const target = path.join(env.dir, "restored");
    restoreBackup(b.path, path.join(target, "data"), path.join(target, "data", "uploads"));
    const restored = await startTestServer(target);
    try {
      const n = (restored.db.prepare("SELECT COUNT(*) AS n FROM dogs").get() as { n: number }).n;
      assert.equal(n, 2);
      const files = fs.readdirSync(path.join(target, "data", "uploads"));
      assert.ok(files.length >= 4);
      const c = new Client(restored.base);
      await c.login("admin@test.cz");
      const doc = (await c.get(`/api/documents?dog_id=${ids.dog}`))[0];
      assert.equal((await c.raw("GET", doc.url)).status, 200);
    } finally {
      await restored.close();
    }
  });
});
