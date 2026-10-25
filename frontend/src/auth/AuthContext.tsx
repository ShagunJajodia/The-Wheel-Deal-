import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api, clearStoredToken, getStoredToken, storeToken } from "../api/client";
import type { User } from "../api/client";

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    const onExpired = () => {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.me()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        // Any failure to load the profile means we cannot trust the session: sign out so
        // the user logs in again, rather than staying half signed in without their role.
        if (active) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function login(email: string, password: string): Promise<void> {
    const credentials = await api.login(email, password);
    storeToken(credentials.access_token);
    setToken(credentials.access_token);
    setIsLoading(true);
    try {
      setUser(await api.me());
    } catch (error) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  function logout(): void {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
