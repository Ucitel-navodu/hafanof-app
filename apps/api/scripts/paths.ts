import path from "node:path";
const root = path.join(__dirname, "..");
export const dataDir = process.env.HAFANOF_DATA_DIR ?? path.join(root, "data");
export const uploadsDir = path.join(dataDir, "uploads");
export const backupsDir = process.env.HAFANOF_BACKUP_DIR ?? path.join(root, "backups");
