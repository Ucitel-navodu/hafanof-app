import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { get, post } from "./api";

export type Level = "none" | "basic" | "own" | "read" | "write";
export interface Me {
  id: number;
  email: string;
  name: string;
  roles: string[];
  person_id: number | null;
  permissions: Record<string, Level>;
}

const ORDER: Level[] = ["none", "basic", "own", "read", "write"];

interface Ctx {
  me: Me | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Má uživatel v modulu aspoň danou úroveň? (Jen pro UI — server ověřuje sám.) */
  can: (module: string, min?: Level) => boolean;
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    get<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setReady(true));
    const onLogout = () => setMe(null);
    window.addEventListener("hafanof:logout", onLogout);
    return () => window.removeEventListener("hafanof:logout", onLogout);
  }, []);

  const value: Ctx = {
    me,
    ready,
    login: async (email, password) => setMe(await post<Me>("/api/auth/login", { email, password })),
    logout: async () => {
      await post("/api/auth/logout").catch(() => undefined);
      setMe(null);
    },
    can: (module, min = "read") => !!me && ORDER.indexOf(me.permissions[module] ?? "none") >= ORDER.indexOf(min),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
