"use client";

import { useSession } from "@/lib/auth-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subscribeToMembers, getCoupleForUser } from "@/lib/repos/coupleRepo";
import { IoCopy, IoCheckmark } from "react-icons/io5";

export default function LobbyPage() {
  const router = useRouter();
  const { session, setCouple } = useSession();
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inviteCode = session.couple?.inviteCode ?? "------";
  const coupleId = session.couple?.id;
  const userId = session.currentUser?.id;

  // ── Poll every 3 seconds to check if partner joined ──────────────────
  const pollForPartner = useCallback(async () => {
    if (!userId) return;
    const couple = await getCoupleForUser(userId);
    if (couple) {
      setCouple(couple);
    }
  }, [userId, setCouple]);

  useEffect(() => {
    if (!coupleId || !userId) return;

    // Poll immediately, then every 3 seconds
    pollForPartner();
    pollRef.current = setInterval(pollForPartner, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [coupleId, userId, pollForPartner]);

  // ── Realtime: subscribe to couple_members changes (backup) ───────────
  useEffect(() => {
    if (!coupleId) return;

    const unsub = subscribeToMembers(coupleId, (updatedCouple) => {
      setCouple(updatedCouple);
    });

    return () => unsub();
  }, [coupleId, setCouple]);

  // ── Auto-navigate when couple status becomes "ready" ─────────────────
  useEffect(() => {
    if (session.couple?.status === "ready") {
      // Stop polling before navigating
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      router.push("/");
    }
  }, [session.couple?.status, router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = inviteCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C] p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="text-2xl font-extrabold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]">
          Waiting for partner...
        </h1>

        <p className="text-sm text-[#636366] dark:text-[#98989D] text-center font-[family-name:var(--font-suse)]">
          Share this invite code with your partner
        </p>

        {/* Invite code */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl
            bg-[#ECE7DE] dark:bg-[#1A1A1C]
            hover:opacity-80 active:scale-[0.98] transition-all group"
        >
          <span className="text-3xl font-extrabold tracking-[0.3em] text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]">
            {inviteCode}
          </span>
          {copied ? (
            <IoCheckmark className="text-xl text-green-500" />
          ) : (
            <IoCopy className="text-xl text-[#98989D] group-hover:text-[#636366]" />
          )}
        </button>

        {copied && (
          <p className="text-sm text-green-500 font-semibold font-[family-name:var(--font-suse)]">
            Copied!
          </p>
        )}

        {/* Members list */}
        <div className="w-full mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#636366] dark:text-[#98989D] mb-2 font-[family-name:var(--font-suse)]">
            Members ({session.couple?.members.length ?? 0} / 2)
          </p>
          {session.couple?.members.map((member, i) => (
            <div
              key={member.id}
              className="flex items-center gap-3 py-2"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                ${i === 0 ? "bg-[#D4628A]" : "bg-[#3A7BD5]"}`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]">
                {member.name}
                {member.id === session.currentUser?.id && (
                  <span className="ml-2 text-xs text-[#98989D]">(you)</span>
                )}
              </span>
            </div>
          ))}

          {/* Waiting slot for partner */}
          {(session.couple?.members.length ?? 0) < 2 && (
            <div className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ECE7DE] dark:bg-[#1A1A1C] border-2 border-dashed border-[#98989D]">
                <span className="text-[#98989D] text-xs">?</span>
              </div>
              <span className="text-sm text-[#98989D] italic font-[family-name:var(--font-suse)]">
                Waiting for partner to join...
              </span>
            </div>
          )}
        </div>

        {/* Pulsing indicator */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-[#3A7BD5] dark:bg-white animate-pulse" />
          <p className="text-xs text-[#98989D] dark:text-[#636366] font-[family-name:var(--font-suse)]">
            Listening for partner via Supabase Realtime
          </p>
        </div>
      </div>
    </div>
  );
}
