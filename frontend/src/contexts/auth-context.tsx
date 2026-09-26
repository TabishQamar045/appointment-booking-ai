"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: User }>("/auth/login", { email, password });
      setIsLoggingOut(false);
      setUser(res.user);
      router.push(res.user.role === "admin" ? "/admin" : "/dashboard");
    },
    [router]
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.post<{ user: User }>("/auth/signup", { email, password, name });
      setIsLoggingOut(false);
      setUser(res.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    // Flips the auth-gated layouts (dashboard/admin) to the branded loading
    // screen the instant "Log out" is clicked, rather than leaving the page
    // looking unresponsive until the network call below resolves. The
    // server call has to finish (clearing the cookie) *before* navigating -
    // see dashboard/layout.tsx's comment on why, re: proxy.ts's redirect loop.
    setIsLoggingOut(true);
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoggingOut, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
