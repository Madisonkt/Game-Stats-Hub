"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { IoCheckmarkCircle, IoPhonePortraitOutline } from "react-icons/io5";
import CloudLoader from "@/components/CloudLoader";

/**
 * Auth callback page (client-side).
 *
 * After the user clicks the magic link in their email, Supabase redirects here
 * with auth tokens in the URL hash fragment (implicit flow).
 * The browser Supabase client (with `detectSessionInUrl: true`) auto-detects
 * the tokens and establishes the session. We wait for that, then redirect.
 *
 * On iOS Safari (not in PWA standalone mode), we show a "Return to App"
 * prompt instead of auto-redirecting, since the PWA shares the same session
 * storage and the user just needs to switch back.
 */

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as Record<string, unknown>).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function AuthCallbackPage() {
  const handled = useRef(false);
  const [authed, setAuthed] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createSupabaseBrowserClient();

    const onSignedIn = () => {
      // If we're on iOS Safari (not inside the PWA), show "go back to app" prompt
      if (isIOSSafari() && !isStandalone()) {
        setAuthed(true);
        setShowPWAPrompt(true);
        return;
      }
      // Otherwise redirect normally
      window.location.href = "/";
    };

    // The browser client auto-handles the URL hash via detectSessionInUrl.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        subscription.unsubscribe();
        onSignedIn();
      }
    });

    // Also check if session is already set (e.g. returning user)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        onSignedIn();
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

  // ── iOS Safari: show "return to PWA" prompt ───────────────
  if (showPWAPrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C] p-6">
        <div
          className="flex flex-col items-center gap-5 w-full max-w-sm bg-[#ECE7DE] dark:bg-[#1A1A1C] p-8"
          style={{ borderRadius: 24 }}
        >
          <IoCheckmarkCircle className="text-green-500" style={{ fontSize: 56 }} />
          <h1
            className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] text-center"
            style={{ fontSize: 22, fontWeight: 800 }}
          >
            You&apos;re signed in!
          </h1>
          <p
            className="text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)] text-center"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            Switch back to the <strong>Cheese Squeeze</strong> app on your home screen to continue.
          </p>

          {/* Visual hint */}
          <div className="flex items-center gap-3 mt-2">
            <div
              className="flex items-center justify-center bg-[#3A7BD5] dark:bg-white"
              style={{ width: 48, height: 48, borderRadius: 12 }}
            >
              <IoPhonePortraitOutline
                className="text-white dark:text-[#0A0A0C]"
                style={{ fontSize: 24 }}
              />
            </div>
            <span
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Tap the app icon on your<br />home screen
            </span>
          </div>

          {/* Fallback: continue in Safari */}
          <button
            onClick={() => { window.location.href = "/"; }}
            className="mt-4 text-[#636366] dark:text-[#98989D] hover:text-[#0A0A0C] dark:hover:text-[#F3F0EA] transition-colors font-[family-name:var(--font-nunito)] underline"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Or continue in Safari
          </button>
        </div>
      </div>
    );
  }

  // ── Default: loading ──────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      <CloudLoader message={authed ? "Signed in! Redirecting..." : "Signing you in..."} />
    </div>
  );
}
