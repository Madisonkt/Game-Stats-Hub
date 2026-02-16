"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Auth callback page (client-side).
 *
 * After the user clicks the magic link in their email, Supabase redirects here
 * with auth tokens in the URL hash fragment (implicit flow).
 * The browser Supabase client (with `detectSessionInUrl: true`) auto-detects
 * the tokens and establishes the session. We wait for that, then redirect.
 */
export default function AuthCallbackPage() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createSupabaseBrowserClient();

    // The browser client auto-handles the URL hash via detectSessionInUrl.
    // We listen for auth state change, then do a FULL page navigation
    // (not client-side router) so everything re-initializes cleanly.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        subscription.unsubscribe();
        window.location.href = "/";
      }
    });

    // Also check if session is already set (e.g. returning user)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        window.location.href = "/";
      }
    });

    // Timeout fallback — if nothing happens in 10s, redirect to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      window.location.href = "/login?error=auth_callback_timeout";
    }, 10000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#3A7BD5] border-t-transparent" />
        <p className="text-sm font-semibold text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
