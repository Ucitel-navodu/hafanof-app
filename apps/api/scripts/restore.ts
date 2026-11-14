/** Obnova ze zálohy. Server musí být zastavený. Použití: npm run restore -- <složka zálohy> */
import path from "node:path";
import { restoreBackup } from "../src/backup";
import { openDb } from "../src/database";
import { audit } from "../src/audit";
import { dataDir, uploadsDir } from "./paths";

const dir = process.argv[2];
if (!dir) {
  console.error("Použití: npm run restore -- <složka zálohy>");
  process.exit(1);
}
restoreBackup(path.resolve(dir), dataDir, uploadsDir);
const db = openDb(dataDir);
audit(db, undefined, "restore", "system", null, { extra: { from: path.basename(dir) } });
const n = (db.prepare("SELECT COUNT(*) AS n FROM dogs").get() as { n: number }).n;
db.close();
console.log(`Obnoveno z ${dir} (psů v evidenci: ${n})`);
