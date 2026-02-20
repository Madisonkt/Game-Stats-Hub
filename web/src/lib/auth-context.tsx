"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getCoupleForUser,
  exitCouple,
  subscribeToMembers,
} from "@/lib/repos/coupleRepo";
import type { User, Couple, Session } from "@/lib/models";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const SESSION_KEY = "rivalry_session";

interface SessionContextValue {
  session: Session;
  isLoading: boolean;
  /** Whether the user has an active Supabase auth session */
  isAuthenticated: boolean;
  /** Set the display name / avatar for the current user (during onboarding) */
  setCurrentUser: (user: User) => void;
  /** Set the couple (from Supabase — kept in-memory + localStorage cache) */
  setCouple: (couple: Couple) => void;
  /** Leave the room (deletes couple_members row in Supabase) */
  exitRoom: () => Promise<void>;
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

function loadPersistedSession(): Session {
  if (typeof window === "undefined") return defaultSession;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch (e) {
    console.error("Failed to load session:", e);
  }
  return defaultSession;
}

function persistSession(s: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch (e) {
    console.error("Failed to persist session:", e);
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(defaultSession);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const unsubMembersRef = useRef<(() => void) | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ── 1. Load persisted local session (cache) ──────────────────────────
  useEffect(() => {
    setSession(loadPersistedSession());
    setSessionLoaded(true);
  }, []);

  // ── 2. Supabase auth: initial session + listener ─────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      setAuthUser(sbSession?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      setAuthUser(sbSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // ── 3. Sync Supabase user → session.currentUser + load couple from DB
  useEffect(() => {
    if (!authReady || !sessionLoaded) return;

    if (authUser) {
      // Update currentUser.id
      setSession((prev) => {
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

      // Load couple from Supabase (source of truth)
      getCoupleForUser(authUser.id).then((couple) => {
        setSession((prev) => {
          // Sync currentUser name/avatar from couple member data
          let currentUser = prev.currentUser;
          if (couple && currentUser) {
            const me = couple.members.find((m) => m.id === currentUser!.id);
            if (me) {
              currentUser = { ...currentUser, name: me.name, avatarUrl: me.avatarUrl };
            }
          }
          const next: Session = { ...prev, couple, currentUser };
          persistSession(next);
          return next;
        });
      });
    } else {
      setSession(defaultSession);
      persistSession(defaultSession);
    }
  }, [authUser, authReady, sessionLoaded]);

  // ── 4. Realtime subscription on couple_members ────────────────────────
  useEffect(() => {
    // Tear down previous subscription
    if (unsubMembersRef.current) {
      unsubMembersRef.current();
      unsubMembersRef.current = null;
    }

    const coupleId = session.couple?.id;
    if (!coupleId) return;

    unsubMembersRef.current = subscribeToMembers(coupleId, (updatedCouple) => {
      setSession((prev) => {
        // Sync currentUser name/avatar from updated couple member data
        let currentUser = prev.currentUser;
        if (currentUser) {
          const me = updatedCouple.members.find((m) => m.id === currentUser!.id);
          if (me) {
            currentUser = { ...currentUser, name: me.name, avatarUrl: me.avatarUrl };
          }
        }
        const next: Session = { ...prev, couple: updatedCouple, currentUser };
        persistSession(next);
        return next;
      });
    });

    return () => {
      if (unsubMembersRef.current) {
        unsubMembersRef.current();
        unsubMembersRef.current = null;
      }
    };
  }, [session.couple?.id]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const isLoading = !authReady || !sessionLoaded;
  const isAuthenticated = authUser !== null;

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

  const exitRoom = useCallback(async () => {
    const coupleId = session.couple?.id;
    const userId = session.currentUser?.id;
    if (coupleId && userId) {
      await exitCouple(coupleId, userId);
    }
    setSession((prev) => {
      const next: Session = { ...prev, couple: null };
      persistSession(next);
      return next;
    });
  }, [session.couple?.id, session.currentUser?.id]);

  const signOut = useCallback(async () => {
    // Leave couple first if in one
    const coupleId = session.couple?.id;
    const userId = session.currentUser?.id;
    if (coupleId && userId) {
      try {
        await exitCouple(coupleId, userId);
      } catch {
        // Best-effort cleanup
      }
    }
    await supabase.auth.signOut();
    setSession(defaultSession);
    persistSession(defaultSession);
  }, [supabase, session.couple?.id, session.currentUser?.id]);

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
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
