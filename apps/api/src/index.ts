import path from "node:path";
import { createApp } from "./app";

const root = path.join(__dirname, "..");
const dataDir = process.env.HAFANOF_DATA_DIR ?? path.join(root, "data");
const { app } = createApp({
  dataDir,
  backupsDir: process.env.HAFANOF_BACKUP_DIR ?? path.join(root, "backups"),
  webDir: process.env.HAFANOF_WEB_DIR ?? path.join(root, "..", "web", "dist"),
  secureCookies: process.env.NODE_ENV === "production",
});

const port = Number(process.env.PORT ?? 4100);
app.listen(port, () => console.log(`Hafanof API: http://localhost:${port}`));
