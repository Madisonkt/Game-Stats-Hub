"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import { IoAdd, IoPeople, IoFlash, IoArrowBack } from "react-icons/io5";
import {
  createCouple,
  joinCouple,
} from "@/lib/repos/coupleRepo";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { session, setCurrentUser, setCouple } = useSession();

  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState(session.currentUser?.name ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = session.currentUser?.id ?? "";

  const handleQuickStart = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCurrentUser({ id: userId, name: name.trim() });
      // Create a Supabase couple (solo/test mode — partner can join later)
      const couple = await createCouple(userId, name.trim());
      setCouple(couple);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCurrentUser({ id: userId, name: name.trim() });
      const couple = await createCouple(userId, name.trim());
      setCouple(couple);
      router.push("/lobby");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length < 4) {
      setError("Enter a valid invite code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCurrentUser({ id: userId, name: name.trim() });
      const couple = await joinCouple(joinCode.trim(), userId, name.trim());
      setCouple(couple);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FEFEFE] p-6">
      <div className="w-full max-w-sm">
        {/* Name input (always shown) */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <h1 className="text-3xl font-extrabold text-[#292929] font-[family-name:var(--font-suse)]">
            {mode === "choose" ? "What's your name?" : mode === "create" ? "Create a Room" : "Join a Room"}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {mode !== "choose" && (
            <button
              onClick={() => { setMode("choose"); setError(null); }}
              className="flex items-center gap-1 text-sm text-[#636366] mb-2 hover:text-[#292929] transition-colors font-[family-name:var(--font-suse)]"
            >
              <IoArrowBack />
              Back
            </button>
          )}

          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl text-base font-semibold
              bg-[#F4F3F1]
              text-[#292929]
              border border-[#F4F3F1]
              placeholder:text-[#636366]
              focus:outline-none focus:ring-2 focus:ring-[#292929]
              font-[family-name:var(--font-suse)]"
          />

          {mode === "join" && (
            <input
              type="text"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full px-4 py-3.5 rounded-xl text-base font-semibold text-center tracking-[0.3em]
                bg-[#F4F3F1]
                text-[#292929]
                border border-[#F4F3F1]
                placeholder:text-[#636366] placeholder:tracking-normal
                focus:outline-none focus:ring-2 focus:ring-[#292929]
                font-[family-name:var(--font-suse)]"
            />
          )}

          {error && (
            <p className="text-sm font-semibold text-red-500 font-[family-name:var(--font-suse)]">
              {error}
            </p>
          )}

          {mode === "choose" ? (
            <>
              <button
                onClick={() => setMode("create")}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                  bg-[#292929] text-white font-bold text-lg
                  hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
                  font-[family-name:var(--font-suse)]"
              >
                <IoAdd className="text-xl" />
                Create Room
              </button>

              <button
                onClick={() => setMode("join")}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                  border border-[#F4F3F1]
                  bg-[#F4F3F1]
                  text-[#292929]
                  font-bold text-lg hover:opacity-80 active:scale-[0.98] transition-all
                  font-[family-name:var(--font-suse)]"
              >
                <IoPeople className="text-xl" />
                Join with Code
              </button>

              <button
                onClick={handleQuickStart}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl
                  text-[#636366] text-sm font-semibold
                  hover:text-[#292929] transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  font-[family-name:var(--font-suse)]"
              >
                <IoFlash />
                {loading ? "Creating..." : "Quick Start (solo test)"}
              </button>
            </>
          ) : mode === "create" ? (
            <button
              onClick={handleCreateRoom}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                bg-[#292929] text-white font-bold text-lg
                hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
                font-[family-name:var(--font-suse)]"
            >
              <IoAdd className="text-xl" />
              Create Room
            </button>
          ) : (
            <button
              onClick={handleJoinRoom}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl
                bg-[#292929] text-white font-bold text-lg
                hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
                font-[family-name:var(--font-suse)]"
            >
              <IoPeople className="text-xl" />
              Join Room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
