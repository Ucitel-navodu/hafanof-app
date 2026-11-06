import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app";
import { hashPassword } from "../src/auth";
import type { DB } from "../src/db";

export interface TestEnv {
  base: string;
  db: DB;
  dir: string;
  server: Server;
  close: () => Promise<void>;
}

export async function startTestServer(dir = fs.mkdtempSync(path.join(os.tmpdir(), "hafanof-test-"))): Promise<TestEnv> {
  const { app, db } = createApp({ dataDir: path.join(dir, "data"), backupsDir: path.join(dir, "backups") });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    base: `http://127.0.0.1:${port}`,
    db,
    dir,
    server,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          db.close();
          resolve();
        });
      }),
  };
}

export function seedUser(db: DB, email: string, name: string, roles: string[], personId: number | null = null) {
  db.prepare("INSERT INTO users(email, name, password_hash, roles, person_id) VALUES (?, ?, ?, ?, ?)").run(
    email,
    name,
    hashPassword("heslo-pro-testy"),
    JSON.stringify(roles),
    personId,
  );
}

export class Client {
  cookie = "";
  constructor(private base: string) {}

  async login(email: string, password = "heslo-pro-testy") {
    const r = await this.raw("POST", "/api/auth/login", { email, password });
    if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }

  async raw(method: string, url: string, body?: unknown, opts: { csrf?: boolean } = {}) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (opts.csrf !== false) headers["x-hafanof"] = "1";
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(this.base + url, { method, headers, body: payload });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: res.status, body: parsed as any, headers: res.headers };
  }

  async ok(method: string, url: string, body?: unknown) {
    const r = await this.raw(method, url, body);
    if (r.status >= 300) throw new Error(`${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }
  get = (u: string) => this.ok("GET", u);
  post = (u: string, b?: unknown) => this.ok("POST", u, b ?? {});
  patch = (u: string, b: unknown) => this.ok("PATCH", u, b);
}

export function fileForm(fields: Record<string, string>, name: string, mime: string, content = "%PDF-1.4 test") {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append("file", new Blob([content], { type: mime }), name);
  return fd;
}
