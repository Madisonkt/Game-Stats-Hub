"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { IoGameController, IoLogInOutline, IoPersonAddOutline } from "react-icons/io5";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "sign-up") {
        const { error: sbError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (sbError) throw sbError;
        // Supabase auto-signs in after signUp (unless email confirmation is required)
        // The auth context listener will pick it up and redirect
      } else {
        const { error: sbError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (sbError) throw sbError;
      }

      // Auth state change will trigger redirect via AuthGuard
      window.location.href = "/";
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Authentication failed";
      // Friendlier error messages
      if (message.includes("Invalid login credentials")) {
        setError("Wrong email or password");
      } else if (message.includes("User already registered")) {
        setError("Account already exists — try signing in instead");
      } else if (message.includes("Email rate limit exceeded")) {
        setError("Too many attempts. Wait a minute and try again");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C] p-6">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <IoGameController className="text-5xl text-[#3A7BD5] dark:text-white" />
          <h1 className="text-3xl font-extrabold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-[#636366] dark:text-[#98989D] text-center font-[family-name:var(--font-suse)]">
            {mode === "sign-in" ? "Sign in to continue" : "Sign up to get started"}
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-suse)]">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              disabled={loading}
              className="w-full px-4 py-3.5 rounded-xl text-base font-semibold mt-1
                bg-[#ECE7DE] dark:bg-[#1A1A1C]
                text-[#0A0A0C] dark:text-[#F3F0EA]
                border border-[#ECE7DE] dark:border-[#1A1A1C]
                placeholder:text-[#636366] dark:placeholder:text-[#98989D]
                focus:outline-none focus:ring-2 focus:ring-[#3A7BD5] dark:focus:ring-white
                disabled:opacity-50
                font-[family-name:var(--font-suse)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-suse)]">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-4 py-3.5 rounded-xl text-base font-semibold mt-1
                bg-[#ECE7DE] dark:bg-[#1A1A1C]
                text-[#0A0A0C] dark:text-[#F3F0EA]
                border border-[#ECE7DE] dark:border-[#1A1A1C]
                placeholder:text-[#636366] dark:placeholder:text-[#98989D]
                focus:outline-none focus:ring-2 focus:ring-[#3A7BD5] dark:focus:ring-white
                disabled:opacity-50
                font-[family-name:var(--font-suse)]"
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-500 font-[family-name:var(--font-suse)]">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl mt-1
              bg-[#3A7BD5] text-white dark:bg-white dark:text-[#0A0A0C] font-bold text-lg
              hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all
              disabled:opacity-60 disabled:cursor-not-allowed
              font-[family-name:var(--font-suse)]"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white dark:border-[#0A0A0C] border-t-transparent" />
            ) : mode === "sign-in" ? (
              <>
                <IoLogInOutline className="text-xl" />
                Sign In
              </>
            ) : (
              <>
                <IoPersonAddOutline className="text-xl" />
                Sign Up
              </>
            )}
          </button>

          {/* Toggle mode */}
          <button
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
            }}
            className="text-sm text-[#636366] dark:text-[#98989D] hover:text-[#0A0A0C] dark:hover:text-[#F3F0EA]
              transition-colors font-[family-name:var(--font-suse)] mt-2 text-center"
          >
            {mode === "sign-in" ? (
              <>Don&apos;t have an account? <span className="font-bold underline">Sign up</span></>
            ) : (
              <>Already have an account? <span className="font-bold underline">Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
