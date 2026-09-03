import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

interface AppDataContextValue {
  pendingApprovals: number;
  refreshPendingApprovals: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const refreshPendingApprovals = useCallback(async () => {
    if (!user || user.activeRole !== "coordinator") return;
    try {
      const res = await api.get<{ pendingApprovals: number }>("/api/coordinator/dashboard");
      setPendingApprovals(res.pendingApprovals);
    } catch {
      // ignore transient errors, badge just stays stale
    }
  }, [user]);

  const value = useMemo(() => ({ pendingApprovals, refreshPendingApprovals }), [pendingApprovals, refreshPendingApprovals]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
