import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getStoredAuth, login as apiLogin, logout as apiLogout } from "./api";
import type { UserProfile } from "./types";

interface AuthCtx {
  user: UserProfile | null;
  token: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { token, user } = getStoredAuth();
    setToken(token);
    setUser(user);
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(() => {
    apiLogout();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, token, ready, signIn, signOut }), [user, token, ready, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}