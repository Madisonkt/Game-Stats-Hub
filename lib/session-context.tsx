import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Session, User, Couple } from "./models";
import { supabase } from "./supabase";
import * as coupleRepo from "./repos/coupleRepo";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const SESSION_KEY = "@rivalry_session";

interface SessionContextValue {
  session: Session;
  isLoading: boolean;
  /** Whether the user has an active Supabase auth session */
  isAuthenticated: boolean;
  /** Set the display name / avatar for the current user (during onboarding) */
  setCurrentUser: (user: User) => void;
  /** Set the couple (after create/join) */
  setCouple: (couple: Couple) => void;
  /** Leave the room but keep your identity — redirects back to onboarding */
  exitRoom: () => void;
  /** Full reset (for debugging / logout) */
  clearSession: () => void;
  /** Sign out of Supabase and clear local session */
  signOut: () => Promise<void>;
}

const defaultSession: Session = {
  currentUser: null,
  couple: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Parse hash-fragment or query params from a URL into a Record.
 * Supabase magic-link redirects include tokens in the hash fragment:
 *   cheesesqueeze://auth/callback#access_token=...&refresh_token=...
 */
function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  // Try hash fragment first
  const hashIdx = url.indexOf("#");
  if (hashIdx !== -1) {
    const fragment = url.substring(hashIdx + 1);
    for (const part of fragment.split("&")) {
      const [key, val] = part.split("=");
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(val ?? "");
    }
  }
  // Also check query params (e.g. PKCE code flow)
  const qIdx = url.indexOf("?");
  if (qIdx !== -1) {
    const hashBound = hashIdx !== -1 ? hashIdx : url.length;
    const queryStr = url.substring(qIdx + 1, hashBound);
    for (const part of queryStr.split("&")) {
      const [key, val] = part.split("=");
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(val ?? "");
    }
  }
  return params;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(defaultSession);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // ── 1. Load persisted local session ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          setSession(JSON.parse(raw) as Session);
        }
      } catch (e) {
        console.error("Failed to load session:", e);
      } finally {
        setSessionLoaded(true);
      }
    })();
  }, []);

  // ── 2. Supabase auth: initial session + listener ─────────────────────
  useEffect(() => {
    // Get the existing persisted Supabase session (if any)
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      setAuthUser(sbSession?.user ?? null);
      setAuthReady(true);
    });

    // Listen for sign-in / sign-out / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      setAuthUser(sbSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 3. Sync Supabase user ID into local session.currentUser ──────────
  useEffect(() => {
    if (!authReady || !sessionLoaded) return;

    if (authUser) {
      // Ensure currentUser.id matches the Supabase user
      setSession((prev) => {
        if (prev.currentUser?.id === authUser.id) return prev; // already synced
        const next: Session = {
          ...prev,
          currentUser: {
            id: authUser.id,
            name: prev.currentUser?.name ?? "",
            avatarUrl: prev.currentUser?.avatarUrl,
          },
        };
        persistSession(next);
        return next;
      });
    } else {
      // Signed out → wipe local identity
      setSession(defaultSession);
      persistSession(defaultSession);
    }
  }, [authUser, authReady, sessionLoaded]);

  // ── 4. Deep-link handling for magic-link callback ────────────────────
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("auth/callback")) return;
      const params = parseUrlParams(url);

      if (params.access_token && params.refresh_token) {
        // Implicit / magic-link grant → set session directly
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      } else if (params.code) {
        // PKCE code exchange
        await supabase.auth.exchangeCodeForSession(params.code);
      }
    };

    // App opened cold via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // App already running, link arrives
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // ── 5. Subscribe to couple repo changes ──────────────────────────────
  useEffect(() => {
    const unsub = coupleRepo.subscribeToCouple((couple) => {
      setSession((prev) => {
        const next = { ...prev, couple };
        persistSession(next);
        return next;
      });
    });
    return unsub;
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────
  const isLoading = !authReady || !sessionLoaded;
  const isAuthenticated = authUser !== null;

  const persistSession = async (s: Session) => {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch (e) {
      console.error("Failed to persist session:", e);
    }
  };

  const setCurrentUser = useCallback((user: User) => {
    setSession((prev) => {
      const next = { ...prev, currentUser: user };
      persistSession(next);
      return next;
    });
  }, []);

  const setCouple = useCallback((couple: Couple) => {
    setSession((prev) => {
      const next = { ...prev, couple };
      persistSession(next);
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession(defaultSession);
    persistSession(defaultSession);
  }, []);

  const exitRoom = useCallback(() => {
    setSession((prev) => {
      const next: Session = { ...prev, couple: null };
      persistSession(next);
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(defaultSession);
    persistSession(defaultSession);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      isAuthenticated,
      setCurrentUser,
      setCouple,
      exitRoom,
      clearSession,
      signOut,
    }),
    [session, isLoading, isAuthenticated, setCurrentUser, setCouple, exitRoom, clearSession, signOut]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
