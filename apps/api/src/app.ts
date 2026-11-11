import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { MulterError } from "multer";
import { openDb, type DB } from "./db";
import { HttpError, loadUser } from "./auth";
import { dogRoutes } from "./routes/dogs";
import { documentRoutes } from "./routes/documents";
import { peopleRoutes } from "./routes/people";
import { adoptionRoutes, placementRoutes } from "./routes/adoptions";
import { calendarRoutes, taskRoutes } from "./routes/tasks";
import {
  adminRoutes,
  auditRoutes,
  authRoutes,
  dashboardRoutes,
  searchRoutes,
  statsRoutes,
  userRoutes,
  type Paths,
} from "./routes/misc";

export interface AppOptions {
  dataDir: string;
  uploadsDir?: string;
  backupsDir?: string;
  /** Složka se sestaveným webem (apps/web/dist) — servíruje se ze stejného originu. */
  webDir?: string;
  secureCookies?: boolean;
}

export function createApp(opts: AppOptions): { app: express.Express; db: DB } {
  const db = openDb(opts.dataDir);
  const paths: Paths = {
    uploadsDir: opts.uploadsDir ?? path.join(opts.dataDir, "uploads"),
    backupsDir: opts.backupsDir ?? path.join(opts.dataDir, "..", "backups"),
    secureCookies: opts.secureCookies ?? false,
  };

  const app = express();
  app.set("trust proxy", "loopback");
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (paths.secureCookies) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(loadUser(db));

  // CSRF: každý zapisující požadavek musí nést vlastní hlavičku, kterou cizí web bez CORS poslat nemůže.
  app.use("/api", (req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("x-hafanof") !== "1")
      return next(new HttpError(403, "Chybí ochranná hlavička požadavku"));
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes(db, paths));
  app.use("/api/dashboard", dashboardRoutes(db));
  app.use("/api/search", searchRoutes(db));
  app.use("/api/dogs", dogRoutes(db));
  app.use("/api/documents", documentRoutes(db, paths.uploadsDir));
  app.use("/api/people", peopleRoutes(db));
  app.use("/api/adoptions", adoptionRoutes(db));
  app.use("/api/placements", placementRoutes(db));
  app.use("/api/tasks", taskRoutes(db));
  app.use("/api/calendar", calendarRoutes(db));
  app.use("/api/stats", statsRoutes(db));
  app.use("/api/audit", auditRoutes(db));
  app.use("/api/users", userRoutes(db));
  app.use("/api/admin", adminRoutes(db, paths));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Neznámý endpoint")));

  if (opts.webDir && fs.existsSync(opts.webDir)) {
    app.use(express.static(opts.webDir, { index: false }));
    app.get("*", (_req, res) => res.sendFile(path.join(opts.webDir!, "index.html")));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof MulterError) return res.status(400).json({ error: `Chyba nahrávání: ${err.message}` });
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint/.test(msg)) return res.status(409).json({ error: "Záznam už existuje" });
    if (/FOREIGN KEY|CHECK constraint/.test(msg)) return res.status(400).json({ error: "Neplatná vazba nebo hodnota" });
    console.error(err);
    res.status(500).json({ error: "Interní chyba serveru" });
  });

  return { app, db };
}
