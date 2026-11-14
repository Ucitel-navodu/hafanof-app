/**
 * Založí první účty. Bez HAFANOF_DEMO=1 vytvoří jen administrátora.
 * S HAFANOF_DEMO=1 přidá ukázkové uživatele všech rolí a pár psů.
 *   HAFANOF_ADMIN_EMAIL=... HAFANOF_ADMIN_PASSWORD=... npm run seed
 */
import crypto from "node:crypto";
import { openDb } from "../src/database";
import { hashPassword } from "../src/auth";
import { nextRegNumber } from "../src/routes/dogs";
import { addDays, today } from "../src/audit";
import { dataDir } from "./paths";
import { MODULE_LIST } from "../src/modules";

const db = openDb(dataDir);
const email = (process.env.HAFANOF_ADMIN_EMAIL ?? "admin@hafanof.cz").toLowerCase();
const password = process.env.HAFANOF_ADMIN_PASSWORD ?? crypto.randomBytes(9).toString("base64url");

function user(email: string, name: string, roles: string[], pw: string, personId: number | null = null) {
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return console.log(`  ${email} už existuje — přeskočeno`);
  db.prepare("INSERT INTO users(email, name, password_hash, roles, person_id) VALUES (?,?,?,?,?)").run(
    email, name, hashPassword(pw), JSON.stringify(roles), personId,
  );
  console.log(`  ${email}  /  ${pw}   [${roles.join(", ")}]`);
}

console.log("Účty:");
user(email, "Administrátor", ["admin"], password);

if (process.env.HAFANOF_DEMO === "1") {
  const demoPw = "hafanof-demo-2026";
  const person = (first: string, last: string, roles: string[], extra: Record<string, unknown> = {}) =>
    Number(db.prepare("INSERT INTO people(first_name, last_name, roles, phone, email, foster_capacity) VALUES (?,?,?,?,?,?)")
      .run(first, last, JSON.stringify(roles), (extra.phone as string) ?? null, (extra.email as string) ?? null, (extra.cap as number) ?? null).lastInsertRowid);
  const dana = person("Dana", "Dočasná", ["foster", "volunteer"], { phone: "+420 777 111 222", email: "dana@example.cz", cap: 2 });
  person("Adam", "Novák", ["adopter"], { phone: "+420 603 123 456", email: "adam@example.cz" });
  user("reditel@hafanof.cz", "Niki (statutární ředitelka)", ["director"], demoPw);
  user("revizor@hafanof.cz", "Revizor", ["auditor"], demoPw);
  user("tym@hafanof.cz", "Terka (tým)", ["team"], demoPw);
  user("dana@hafanof.cz", "Dana (dočaskářka)", ["foster"], demoPw, dana);
  user("dobrovolnik@hafanof.cz", "Dobrovolník", ["volunteer"], demoPw);

  const dog = (name: string, days: number, status: string, extra: Record<string, unknown> = {}) => {
    const intake = addDays(today(), -days);
    const reg = nextRegNumber(db, intake);
    const id = Number(db.prepare(`INSERT INTO dogs(reg_number, name, sex, breed, intake_date, intake_type, status, location, temperament)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(reg, name, (extra.sex as string) ?? "unknown", (extra.breed as string) ?? "Kříženec",
      intake, "Odebrání / přijetí od obce", status, (extra.location as string) ?? "Hafanof", (extra.temperament as string) ?? null).lastInsertRowid);
    db.prepare("INSERT INTO dog_events(dog_id, date, type, title) VALUES (?,?,?,?)").run(id, intake, "intake", `Přijetí psa (${reg})`);
    return id;
  };
  const shebby = dog("Shebby", 40, "for_adoption", { sex: "female", temperament: "Mazlivá, k lidem otevřená" });
  const bara = dog("Bára", 12, "foster", { sex: "female", location: "DP: Dana Dočasná" });
  dog("Rex", 3, "new", { sex: "male", breed: "Německý ovčák" });
  db.prepare("INSERT INTO placements(dog_id, person_id, start_date) VALUES (?,?,?)").run(bara, dana, addDays(today(), -10));
  db.prepare("INSERT INTO health_records(dog_id, kind, date, name, clinic, next_due) VALUES (?,?,?,?,?,?)")
    .run(shebby, "vaccination", addDays(today(), -30), "Nobivac DHPPi+L", "Veterina Lhota", addDays(today(), 5));
  db.prepare("INSERT INTO tasks(title, due_date, priority) VALUES (?,?,?)").run("Nafotit Shebby na adopční inzerát", today(), "high");
  // Ukázková data jednotlivých modulů (finance, sklad, spolek…).
  for (const m of MODULE_LIST) m.seedDemo?.(db);
  console.log("Ukázková data vložena.");
}
if (!process.env.HAFANOF_ADMIN_PASSWORD) console.log("\n⚠ Heslo administrátora bylo vygenerováno — uložte si ho a po přihlášení změňte.");
db.close();
