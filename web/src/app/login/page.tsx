"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { IoGameController, IoMailOpenOutline, IoMailOutline, IoArrowBack } from "react-icons/io5";

type Step = "email" | "sent";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleSendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (sbError) throw sbError;
      setStep("sent");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send magic link";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C] p-6">
      <div className="w-full max-w-sm">
        {step === "email" ? (
          <>
            {/* Title */}
            <div className="flex flex-col items-center gap-3 mb-12">
              <IoGameController className="text-5xl text-[#3A7BD5] dark:text-white" />
              <h1 className="text-3xl font-extrabold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]">
                Welcome
              </h1>
              <p className="text-sm text-[#636366] dark:text-[#98989D] text-center font-[family-name:var(--font-nunito)]">
                Sign in with your email to get started
              </p>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
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
                onKeyDown={(e) => e.key === "Enter" && handleSendMagicLink()}
                className="w-full px-4 py-3.5 rounded-xl text-base font-semibold
                  bg-[#ECE7DE] dark:bg-[#1A1A1C]
                  text-[#0A0A0C] dark:text-[#F3F0EA]
                  border border-[#ECE7DE] dark:border-[#1A1A1C]
                  placeholder:text-[#636366] dark:placeholder:text-[#98989D]
                  focus:outline-none focus:ring-2 focus:ring-[#3A7BD5] dark:focus:ring-white
                  disabled:opacity-50
                  font-[family-name:var(--font-nunito)]"
              />

              {error && (
                <p className="text-sm font-semibold text-red-500 font-[family-name:var(--font-nunito)]">
                  {error}
                </p>
              )}

              <button
                onClick={handleSendMagicLink}
                disabled={loading}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                  bg-[#3A7BD5] text-white dark:bg-white dark:text-[#0A0A0C] font-bold text-lg
                  hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all
                  disabled:opacity-60 disabled:cursor-not-allowed
                  font-[family-name:var(--font-nunito)]"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <IoMailOutline className="text-xl" />
                    Send Magic Link
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Sent confirmation */}
            <div className="flex flex-col items-center gap-3 mb-12">
              <IoMailOpenOutline className="text-6xl text-[#3A7BD5] dark:text-white" />
              <h1 className="text-3xl font-extrabold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]">
                Check your email
              </h1>
              <p className="text-sm text-[#636366] dark:text-[#98989D] text-center font-[family-name:var(--font-nunito)]">
                We sent a sign-in link to
              </p>
              <p className="text-base font-bold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]">
                {email.trim().toLowerCase()}
              </p>
              <p className="text-sm text-[#636366] dark:text-[#98989D] text-center mt-2 font-[family-name:var(--font-nunito)]">
                Click the link in the email to sign in.
                You&apos;ll be redirected automatically.
              </p>
            </div>

            <button
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                border border-[#ECE7DE] dark:border-[#1A1A1C]
                bg-[#ECE7DE] dark:bg-[#1A1A1C]
                text-[#0A0A0C] dark:text-[#F3F0EA]
                font-bold text-lg hover:opacity-80 active:scale-[0.98] transition-all
                font-[family-name:var(--font-nunito)]"
            >
              <IoArrowBack className="text-lg" />
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
