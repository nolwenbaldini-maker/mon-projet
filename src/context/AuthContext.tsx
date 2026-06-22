import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  customerCreate,
  customerLogin,
  customerLogout,
  getCustomer,
  type Customer,
} from "../shopify/customer";

const TOKEN_KEY = "cash16_customer_token";

interface AuthContextValue {
  token: string | null;
  customer: Customer | null;
  /** Chargement initial (lecture du jeton stocké). */
  initializing: boolean;
  busy: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);

  // Au démarrage : on relit le jeton stocké et on recharge le client.
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          const c = await getCustomer(saved);
          if (c) {
            setToken(saved);
            setCustomer(c);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } catch {
        // jeton invalide/expiré : on repart déconnecté
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  async function applyToken(accessToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    const c = await getCustomer(accessToken);
    setToken(accessToken);
    setCustomer(c);
  }

  async function login(email: string, password: string) {
    setBusy(true);
    try {
      const { accessToken } = await customerLogin(email.trim(), password);
      await applyToken(accessToken);
    } finally {
      setBusy(false);
    }
  }

  async function signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    setBusy(true);
    try {
      await customerCreate({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      const { accessToken } = await customerLogin(email.trim(), password);
      await applyToken(accessToken);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (token) await customerLogout(token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  }

  async function refresh() {
    if (!token) return;
    const c = await getCustomer(token);
    setCustomer(c);
  }

  const value = useMemo(
    () => ({ token, customer, initializing, busy, login, signup, logout, refresh }),
    [token, customer, initializing, busy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
