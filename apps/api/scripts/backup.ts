/** Záloha databáze a souborů. Vhodné spouštět z cronu, např. denně ve 2:00. */
import { openDb } from "../src/db";
import { createBackup } from "../src/backup";
import { audit } from "../src/audit";
import { backupsDir, dataDir, uploadsDir } from "./paths";

const db = openDb(dataDir);
const b = createBackup(db, uploadsDir, backupsDir);
audit(db, undefined, "backup", "system", null, { extra: { name: b.name, source: "cli" } });
db.close();
console.log(`Záloha vytvořena: ${b.path}`);
