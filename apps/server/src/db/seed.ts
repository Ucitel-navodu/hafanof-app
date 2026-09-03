import { randomUUID } from "node:crypto";
import { db } from "./client";
import { migrate } from "./schema";

function run() {
  migrate();

  const count = db.prepare("SELECT COUNT(*) as c FROM dogs").get() as { c: number };
  if (count.c > 0) {
    console.log("Seed skipped: data already present.");
    return;
  }

  db.prepare(
    `INSERT INTO users (id, name, initials, roles) VALUES (?, ?, ?, ?)`
  ).run("demo-user", "Klára Nováková", "KN", JSON.stringify(["coordinator", "foster", "patron", "adopter"]));

  const dogs = [
    {
      id: "shebby",
      name: "Shebby",
      sex: "fena",
      age_label: "4 roky",
      breed: "Kříženec",
      weight_kg: 18,
      status: "V dočasce",
      foster_name: "Klára N.",
      in_care_since: "12. 5. 2026",
      chip: "203 098 100 421",
      neutered: "Ano · 3/2026",
      vet: "MVDr. Horák",
      vaccination: "4/2026",
      deworming: "8/2026",
      last_checkup: "18. 8. 2026",
      looking_for_cs: "Zkušenost s aktivním psem, zahrada s plotem alespoň 160 cm, bez malých dětí. Ke kočkám netestovaná.",
      looking_for_en: "Experience with an active dog, a garden with a fence at least 160 cm, no small children. Not tested with cats.",
      description_cs: "Kříženec, fena, 4 roky, 18 kg.",
      description_en: "Mixed breed, female, 4 years, 18 kg.",
      tags: JSON.stringify([]),
      ready_to_adopt: 0,
    },
    {
      id: "harry",
      name: "Harry (Ron)",
      sex: "pes",
      age_label: "6 let",
      breed: "Stafordšírský bulteriér",
      weight_kg: 26,
      status: "K adopci",
      foster_name: "Petra S.",
      in_care_since: "3/2026",
      chip: "203 098 100 118",
      neutered: "Ano · 4/2026",
      vet: "MVDr. Horák",
      vaccination: "4/2026",
      deworming: "8/2026",
      last_checkup: "18. 8. 2026",
      looking_for_cs: "Domov bez jiných psů, zkušenost s plemenem výhodou.",
      looking_for_en: "A home without other dogs, breed experience is a plus.",
      description_cs: "Staford, který se naučil, že ruce nejsou nebezpečné. Miluje vodu, dlouhé chůze a spánek na gauči. Hledá domov bez jiných psů.",
      description_en: "A Staffie who learned that hands are not dangerous. Loves water, long walks and sleeping on the couch. Looking for a home without other dogs.",
      tags: JSON.stringify(["Kastrovaný", "Čipovaný", "Bez dětí do 10 let", "Zahrada"]),
      ready_to_adopt: 1,
    },
    {
      id: "mia",
      name: "Mia",
      sex: "fena",
      age_label: "2 roky",
      breed: "Voříšek",
      weight_kg: 11,
      status: "Léčba",
      foster_name: "Jana K.",
      in_care_since: "6/2026",
      chip: "203 098 100 233",
      neutered: "Ne",
      vet: "MVDr. Horák",
      vaccination: "6/2026",
      deworming: "8/2026",
      last_checkup: "3. 9. 2026",
      looking_for_cs: "Klidná domácnost, čas na doléčení po operaci.",
      looking_for_en: "A calm household, time to recover after surgery.",
      description_cs: "Voříšek, fena, 2 roky, 11 kg.",
      description_en: "Mixed breed, female, 2 years, 11 kg.",
      tags: JSON.stringify([]),
      ready_to_adopt: 0,
    },
    {
      id: "jonatan",
      name: "Jonatán",
      sex: "pes",
      age_label: "8 let",
      breed: "Bull kříženec",
      weight_kg: 24,
      status: "Rezervace",
      foster_name: "Tomáš L.",
      in_care_since: "1/2026",
      chip: "203 098 100 345",
      neutered: "Ano · 2/2026",
      vet: "MVDr. Horák",
      vaccination: "2/2026",
      deworming: "8/2026",
      last_checkup: "20. 8. 2026",
      looking_for_cs: "Domov, kde se nikdo nezalekne šedivého čenichu.",
      looking_for_en: "A home where nobody minds a grey muzzle.",
      description_cs: "Osm let a pořád běhá jako blázen.",
      description_en: "Eight years old and still runs like crazy.",
      tags: JSON.stringify([]),
      ready_to_adopt: 0,
    },
    {
      id: "sofie",
      name: "Sofie",
      sex: "fena",
      age_label: "1 rok",
      breed: "Kříženec",
      weight_kg: 12,
      status: "Hledá DP",
      foster_name: null,
      in_care_since: "8/2026",
      chip: "203 098 100 456",
      neutered: "Ne",
      vet: "MVDr. Horák",
      vaccination: "8/2026",
      deworming: "8/2026",
      last_checkup: "25. 8. 2026",
      looking_for_cs: "Hledáme jí nejdřív dočasku, ne trvalý domov.",
      looking_for_en: "We're first looking for a foster home for her, not a permanent one.",
      description_cs: "Kříženec, fena, 1 rok, 12 kg.",
      description_en: "Mixed breed, female, 1 year, 12 kg.",
      tags: JSON.stringify([]),
      ready_to_adopt: 0,
    },
  ];

  const insertDog = db.prepare(`
    INSERT INTO dogs (id,name,sex,age_label,breed,weight_kg,status,foster_name,in_care_since,chip,neutered,vet,vaccination,deworming,last_checkup,looking_for_cs,looking_for_en,description_cs,description_en,tags,ready_to_adopt)
    VALUES (@id,@name,@sex,@age_label,@breed,@weight_kg,@status,@foster_name,@in_care_since,@chip,@neutered,@vet,@vaccination,@deworming,@last_checkup,@looking_for_cs,@looking_for_en,@description_cs,@description_en,@tags,@ready_to_adopt)
  `);
  for (const d of dogs) insertDog.run(d);

  const tasks = [
    { id: "t1", title: "Veterinář — Mia", meta: "Kontrola po operaci, MVDr. Horák", time_label: "14:00", done: 0 },
    { id: "t2", title: "Venčení — Harry", meta: "S Petrou, park pod Křížovou", time_label: "17:00", done: 1 },
    { id: "t3", title: "Předání Sofie do dočasky", meta: "Chybí podpis smlouvy", time_label: "dnes", done: 0 },
    { id: "t4", title: "Doplnit krmivo Gheťáčkům", meta: "Depo Litvínov, 2 pytle senior", time_label: "dnes", done: 0 },
  ];
  const insertTask = db.prepare(`INSERT INTO tasks (id,title,meta,time_label,done) VALUES (@id,@title,@meta,@time_label,@done)`);
  for (const t of tasks) insertTask.run(t);

  const appts = [
    { id: randomUUID(), day: 3, time_label: "9:30", title: "Odběry — Jonatán", meta: "MVDr. Horák, Litvínov", who: "Tomáš L." },
    { id: randomUUID(), day: 3, time_label: "14:00", title: "Kontrola po operaci — Mia", meta: "MVDr. Horák, Litvínov", who: "Jana K." },
    { id: randomUUID(), day: 3, time_label: "17:00", title: "Předadopční návštěva", meta: "Novákovi, Most · Shebby", who: "Klára N." },
  ];
  const insertAppt = db.prepare(`INSERT INTO appointments (id,day,time_label,title,meta,who) VALUES (@id,@day,@time_label,@title,@meta,@who)`);
  for (const a of appts) insertAppt.run(a);

  const meds = [
    { id: randomUUID(), dog_id: "shebby", drug: "Enroxil 50 mg · 1× denně ráno", days_left: 2, pct: 66, urgent: 1 },
    { id: randomUUID(), dog_id: "mia", drug: "Meloxidyl · 2× denně, po jídle", days_left: 5, pct: 30, urgent: 0 },
  ];
  const insertMed = db.prepare(`INSERT INTO medications (id,dog_id,drug,days_left,pct,urgent) VALUES (@id,@dog_id,@drug,@days_left,@pct,@urgent)`);
  for (const m of meds) insertMed.run(m);

  const diaryEntries = [
    { id: randomUUID(), dog_id: "shebby", author: "Klára N.", date_label: "2. 9.", mood: "moodCalm", checks: JSON.stringify({ c1: true, c2: true, c3: true, c4: true }), note: "Snědla obě porce, na vodítku už netahá. Odpoledne hodinu na zahradě s Harrym, bez konfliktu.", created_at: new Date("2026-09-02").toISOString() },
    { id: randomUUID(), dog_id: "shebby", author: "Klára N.", date_label: "1. 9.", mood: "moodNerv", checks: JSON.stringify({ c1: true, c2: true, c3: false, c4: true }), note: "Ráno kašlala, po léku do večera v pořádku. Bouřka ji vyděsila, spala v předsíni.", created_at: new Date("2026-09-01").toISOString() },
  ];
  const insertDiary = db.prepare(`INSERT INTO diary_entries (id,dog_id,author,date_label,mood,checks,note,created_at) VALUES (@id,@dog_id,@author,@date_label,@mood,@checks,@note,@created_at)`);
  for (const e of diaryEntries) insertDiary.run(e);

  const queue = [
    { id: "q1", dog_id: "shebby", author: "Klára N. · dnes", story: "Poprvé si sama vlezla na gauč a usnula mi na nohách. Tři měsíce jí trvalo si dovolit odpočívat.", photos: JSON.stringify([]), tags: JSON.stringify(["t_novy"]), status: "pending", created_at: new Date().toISOString() },
    { id: "q2", dog_id: "jonatan", author: "Tomáš L. · včera", story: "Osm let a pořád běhá jako blázen. Hledáme mu domov, kde se nikdo nezalekne šedivého čenichu.", photos: JSON.stringify([]), tags: JSON.stringify(["t_adopce"]), status: "pending", created_at: new Date().toISOString() },
  ];
  const insertQueue = db.prepare(`INSERT INTO approval_queue (id,dog_id,author,story,photos,tags,status,created_at) VALUES (@id,@dog_id,@author,@story,@photos,@tags,@status,@created_at)`);
  for (const q of queue) insertQueue.run(q);

  const wishes = [
    { id: "w1", dog_id: "shebby", title: "Granule pro citlivé zažívání", for_label: "Shebby · dočaska Litvínov", goal_amount: 1200, current_amount: 744 },
    { id: "w2", dog_id: "harry", title: "Rehabilitace kolena", for_label: "Harry · 4 návštěvy", goal_amount: 5000, current_amount: 1900 },
    { id: "w3", dog_id: "sofie", title: "Zimní pelíšek a deka", for_label: "Sofie · nová dočaska", goal_amount: 800, current_amount: 680 },
  ];
  const insertWish = db.prepare(`INSERT INTO wishes (id,dog_id,title,for_label,goal_amount,current_amount) VALUES (@id,@dog_id,@title,@for_label,@goal_amount,@current_amount)`);
  for (const w of wishes) insertWish.run(w);

  db.prepare(`INSERT INTO patronages (id,dog_id,monthly_amount,given_total,since_label,status) VALUES (?,?,?,?,?,?)`)
    .run(randomUUID(), "harry", 300, 4200, "3/2026", "active");

  const updates = [
    { id: randomUUID(), dog_id: "harry", title: "Harry poprvé u vody", body: "Zvládl celou cestu k jezeru bez tahání a do vody si sám vlezl po kolena. Petra říká, že je to jiný pes.", author: "Petra S.", date_label: "30. 8.", photo: null },
    { id: randomUUID(), dog_id: "harry", title: "Veterinární kontrola v pořádku", body: "Kloub je stabilní, doporučené jen plavání a klidná chůze.", author: "MVDr. Horák", date_label: "18. 8.", photo: null },
  ];
  const insertUpdate = db.prepare(`INSERT INTO patron_updates (id,dog_id,title,body,author,date_label,photo) VALUES (@id,@dog_id,@title,@body,@author,@date_label,@photo)`);
  for (const u of updates) insertUpdate.run(u);

  const applications = [
    { id: randomUUID(), dog_id: "shebby", applicant_name: "Novákovi · Most", housing: null, household: null, why: null, status: "pending", created_at: new Date("2026-08-28").toISOString() },
    { id: randomUUID(), dog_id: "shebby", applicant_name: "P. Dvořák · Praha", housing: "housingFlat", household: null, why: null, status: "rejected", created_at: new Date("2026-08-19").toISOString() },
  ];
  const insertApp = db.prepare(`INSERT INTO adoption_applications (id,dog_id,applicant_name,housing,household,why,status,created_at) VALUES (@id,@dog_id,@applicant_name,@housing,@household,@why,@status,@created_at)`);
  for (const a of applications) insertApp.run(a);

  console.log("Seed complete.");
}

run();
