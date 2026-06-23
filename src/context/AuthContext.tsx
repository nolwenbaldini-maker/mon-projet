import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

/** Adresse de retour de l'app après connexion (à autoriser dans Supabase). */
export const AUTH_REDIRECT = makeRedirectUri({ scheme: "cash16", path: "auth-callback" });

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  busy: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Renvoie true si un email de confirmation a été envoyé (pas encore connecté). */
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
      if (res.type !== "success") return; // annulé par l'utilisateur
      const url = res.url;
      if (url.includes("error=")) {
        throw new Error("La connexion Google a été refusée.");
      }
      const code = url.includes("code=") ? url.split("code=")[1].split(/[&#]/)[0] : null;
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) throw exErr;
      }
    } finally {
      setBusy(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(translate(error.message));
    } finally {
      setBusy(false);
    }
  }

  async function signUpWithEmail(email: string, password: string, fullName: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw new Error(translate(error.message));
      // Si la confirmation par email est activée, aucune session n'est créée.
      return !data.session;
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      busy,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [session, initializing, busy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Traduit quelques messages d'erreur Supabase courants. */
function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/user already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/password should be at least/i.test(msg))
    return "Mot de passe trop court (6 caractères minimum).";
  if (/unable to validate email/i.test(msg)) return "Adresse email invalide.";
  return msg;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
