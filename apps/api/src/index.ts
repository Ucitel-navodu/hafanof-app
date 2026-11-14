import path from "node:path";
import { createApp } from "./app";
import { startScheduler } from "./jobs";

const root = path.join(__dirname, "..");
const dataDir = process.env.HAFANOF_DATA_DIR ?? path.join(root, "data");
const { app, ctx } = createApp({
  dataDir,
  backupsDir: process.env.HAFANOF_BACKUP_DIR ?? path.join(root, "backups"),
  webDir: process.env.HAFANOF_WEB_DIR ?? path.join(root, "..", "web", "dist"),
  secureCookies: process.env.NODE_ENV === "production",
});

// Naplánované úlohy (zálohy, e-mailové souhrny…) — vypnout lze HAFANOF_SCHEDULER=off.
if (process.env.HAFANOF_SCHEDULER !== "off") startScheduler(ctx);

const port = Number(process.env.PORT ?? 4100);
app.listen(port, () => console.log(`Hafanof API: http://localhost:${port}`));
