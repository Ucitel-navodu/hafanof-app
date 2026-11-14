/** Základ platformy: migrace, plánovač úloh, registr upozornění/kalendáře/vyhledávání. */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "../src/migrations/runner";
import { allMigrations, MODULE_LIST } from "../src/modules";
import { dueRunKey, runJob } from "../src/jobs";
import { pragueNow } from "../src/time";
import { collectAlerts } from "../src/registry";
import type { JobDef } from "../src/modules/types";
import { Client, seedUser, startTestServer, type TestEnv } from "./helpers";

describe("Migrace", () => {
  test("proběhnou jednou a podruhé nic nedělají", () => {
    const db = new DatabaseSync(":memory:");
    const first = runMigrations(db, allMigrations());
    assert.ok(first.includes(1) && first.includes(2));
    assert.deepEqual(runMigrations(db, allMigrations()), []);
    const cols = (db.prepare("PRAGMA table_info(people)").all() as { name: string }[]).map((c) => c.name);
    assert.ok(cols.includes("kind") && cols.includes("ico"));
  });

  test("chybná migrace se vrátí celá a nezapíše se", () => {
    const db = new DatabaseSync(":memory:");
    assert.throws(
      () =>
        runMigrations(db, [
          { id: 1, name: "ok", up: (d) => d.exec("CREATE TABLE a (x)") },
          { id: 2, name: "bad", up: (d) => d.exec("CREATE TABLE b (x); THIS IS NOT SQL") },
        ]),
      /Migrace 2/,
    );
    assert.deepEqual((db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id), [1]);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'b'").get(), undefined);
  });

  test("duplicitní ID migrace se odmítne", () => {
    const db = new DatabaseSync(":memory:");
    const m = { id: 7, name: "x", up: () => undefined };
    assert.throws(() => runMigrations(db, [m, { ...m }]), /Duplicitní/);
  });

  test("každý modul má migrace jen ve svém rozsahu", () => {
    assert.doesNotThrow(() => allMigrations());
    assert.ok(MODULE_LIST.some((m) => m.name === "core"));
  });
});

describe("Plánovač úloh", () => {
  test("denní úloha má klíč až po nastaveném čase (Praha)", () => {
    const job: JobDef = { name: "t", label: "t", schedule: { daily: "02:30" }, run: () => undefined };
    // 2026-01-15 01:00 UTC = 02:00 SEČ → ještě ne; 02:00 UTC = 03:00 SEČ → ano.
    assert.equal(dueRunKey(job, new Date("2026-01-15T01:00:00Z")), null);
    assert.equal(dueRunKey(job, new Date("2026-01-15T02:00:00Z")), "2026-01-15");
    // Letní čas: 2026-07-15 00:45 UTC = 02:45 SELČ → ano.
    assert.equal(dueRunKey(job, new Date("2026-07-15T00:45:00Z")), "2026-07-15");
  });

  test("pražské datum se liší od UTC po půlnoci", () => {
    assert.equal(pragueNow(new Date("2026-03-01T23:30:00Z")).date, "2026-03-02");
  });

  test("úloha s týmž klíčem proběhne jen jednou; chyba se zaznamená", async () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db, allMigrations());
    let n = 0;
    const ok: JobDef = { name: "count", label: "c", schedule: { everyMinutes: 5 }, run: () => void n++ };
    const ctx = { db, paths: { dataDir: "", uploadsDir: "", backupsDir: "", secureCookies: false } };
    assert.equal((await runJob(ctx, ok, "k1")).status, "ok");
    assert.equal((await runJob(ctx, ok, "k1")).status, "skipped");
    assert.equal(n, 1);
    const bad: JobDef = { name: "bad", label: "b", schedule: { everyMinutes: 5 }, run: () => { throw new Error("boom"); } };
    const r = await runJob(ctx, bad, "k1");
    assert.equal(r.status, "error");
    assert.equal((db.prepare("SELECT message FROM job_runs WHERE name = 'bad'").get() as { message: string }).message, "boom");
  });
});

describe("Registr upozornění", () => {
  let env: TestEnv;
  before(async () => {
    env = await startTestServer();
    seedUser(env.db, "admin@t.cz", "Admin", ["admin"]);
    seedUser(env.db, "dobro@t.cz", "Dobro", ["volunteer"]);
  });
  after(() => env.close());

  test("upozornění respektují oprávnění a chyba poskytovatele nic neshodí", async () => {
    const admin = new Client(env.base);
    await admin.login("admin@t.cz");
    const old = "2020-01-01";
    await admin.post("/api/dogs", { name: "Bezčip", intake_date: old });
    const adminAlerts = await admin.get("/api/alerts");
    assert.ok(adminAlerts.some((a: any) => a.key.startsWith("dog:nochip:")), "admin vidí chybějící čip");

    const vol = new Client(env.base);
    await vol.login("dobro@t.cz");
    const volAlerts = await vol.get("/api/alerts");
    assert.ok(!volAlerts.some((a: any) => a.module === "dogs"), "dobrovolník nevidí upozornění k evidenci psů");

    const core = MODULE_LIST[0];
    const broken = { module: "dogs" as const, min: "read" as const, collect: () => { throw new Error("x"); } };
    core.alerts!.push(broken);
    const origError = console.error;
    console.error = () => undefined;
    try {
      const user = { id: 1, email: "admin@t.cz", name: "Admin", roles: ["admin" as const], person_id: null };
      assert.ok(collectAlerts(env.db, user).length > 0);
    } finally {
      console.error = origError;
      core.alerts!.pop();
    }
  });
});

describe("Dokumenty navázané na záznamy modulů", () => {
  let env: TestEnv;
  const refModule = {
    name: "test-ref",
    documentRefs: [
      {
        refType: "secret_thing",
        // Jen admin vidí; připojit smí jen admin.
        canView: (_db: unknown, user: { roles: string[] }) => user.roles.includes("admin"),
        canAttach: (_db: unknown, user: { roles: string[] }) => user.roles.includes("admin"),
      },
    ],
  };
  before(async () => {
    env = await startTestServer();
    seedUser(env.db, "admin@r.cz", "Admin", ["admin"]);
    seedUser(env.db, "tym@r.cz", "Tým", ["team"]);
    MODULE_LIST.push(refModule as never);
  });
  after(() => {
    MODULE_LIST.pop();
    return env.close();
  });

  test("přístup řídí modul, ne obecné oprávnění k dokumentům", async () => {
    const { fileForm } = await import("./helpers");
    const admin = new Client(env.base);
    await admin.login("admin@r.cz");
    const team = new Client(env.base);
    await team.login("tym@r.cz");
    const dog = await admin.post("/api/dogs", { name: "Ref", intake_date: "2026-01-01" });
    const doc = await admin.post("/api/documents", fileForm({ ref_type: "secret_thing", ref_id: "5", dog_id: String(dog.id), title: "Účtenka" }, "u.pdf", "application/pdf"));
    assert.equal((await admin.raw("GET", doc.url)).status, 200);
    assert.equal((await team.raw("GET", doc.url)).status, 404, "tým s documents:write doklad modulu nevidí");
    const list = await team.get(`/api/documents?dog_id=${dog.id}`);
    assert.ok(!list.some((d: any) => d.id === doc.id), "doklad modulu není v obecném seznamu dokumentů psa");
    assert.equal((await team.raw("GET", "/api/documents?ref_type=secret_thing&ref_id=5")).status, 404);
    assert.equal((await admin.get("/api/documents?ref_type=secret_thing&ref_id=5")).length, 1);
    assert.equal((await team.raw("DELETE", `/api/documents/${doc.id}`)).status, 403);
    assert.equal((await team.raw("POST", "/api/documents", fileForm({ ref_type: "secret_thing", ref_id: "5" }, "x.pdf", "application/pdf"))).status, 403);
    assert.equal((await admin.raw("POST", "/api/documents", fileForm({ ref_type: "nope", ref_id: "1" }, "x.pdf", "application/pdf"))).status, 400);
    const tl = await admin.get(`/api/dogs/${dog.id}/timeline`);
    assert.ok(!tl.some((e: any) => e.type === "document"), "doklad modulu se nepropisuje do časové osy psa");
  });
});
