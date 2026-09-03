import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../api/client";
import { Role, User } from "../api/types";

const TOKEN_KEY = "hafanof.token";

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (role: Role) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        setAuthToken(stored);
        try {
          const res = await api.get<{ user: User }>("/api/auth/me");
          setUser(res.user);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (role: Role) => {
    const res = await api.post<LoginResponse>("/api/auth/login", { role });
    setAuthToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
  }, []);

  const switchRole = useCallback(async (role: Role) => {
    const res = await api.post<LoginResponse>("/api/auth/switch-role", { role });
    setAuthToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, switchRole, logout }), [user, loading, login, switchRole, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
