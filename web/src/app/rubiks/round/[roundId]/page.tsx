"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import * as rubiksRepo from "@/lib/repos/rubiksRepo";
import type { Round, Solve } from "@/lib/models";
import CloudLoader from "@/components/CloudLoader";
import {
  IoCheckmarkCircle,
  IoArrowBack,
  IoCopy,
} from "react-icons/io5";

// ── helpers ─────────────────────────────────────────────────

function formatMs(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${rem}`;
}

function formatMsDisplay(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function getPlayerColor(index: number): string {
  return index === 0 ? "#E07850" : "#F1899C";
}

// ── Main page ───────────────────────────────────────────────

export default function AsyncRoundPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;

  const { session, isLoading: sessionLoading } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [round, setRound] = useState<Round | null>(null);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const timerStartRef = useRef<number>(0);

  const [showResult, setShowResult] = useState(false);
  const [resultSolves, setResultSolves] = useState<Solve[]>([]);
  const confettiFiredRef = useRef(false);
  const revealingRef = useRef(false); // prevent duplicate reveal calls

  // ── Load round ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionLoading) return;
    if (!currentUser) {
      // Not logged in — redirect to login with return URL
      router.replace(`/login?next=/rubiks/round/${roundId}`);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const r = await rubiksRepo.getRound(roundId);
        if (!r) {
          setLoadError("Round not found.");
          return;
        }
        // Verify user is a member of the couple
        if (!couple || couple.id !== r.coupleId) {
          setLoadError("You're not part of this challenge. Make sure you're logged in with the right account.");
          return;
        }
        setRound(r);
        const s = await rubiksRepo.getSolves(roundId);
        setSolves(s);

        // If already revealed, show result immediately
        if (r.revealStatus === "revealed" || r.status === "closed") {
          setResultSolves(s);
          setShowResult(true);
        }
      } catch {
        setLoadError("Failed to load round.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [roundId, currentUser, couple, sessionLoading, router]);

  // ── Subscribe to round & solves changes ───────────────────
  useEffect(() => {
    if (!round?.id) return;

    const unsubRound = rubiksRepo.subscribeToRound(round.id, (updated) => {
      if (!updated) return;
      setRound(updated);
      // Detect reveal
      if (!confettiFiredRef.current && (updated.revealStatus === "revealed" || updated.status === "closed")) {
        confettiFiredRef.current = true;
        rubiksRepo.getSolves(updated.id).then((allSolves) => {
          setResultSolves(allSolves);
          setShowResult(true);
        });
      }
    });

    const unsubSolves = rubiksRepo.subscribeToSolves(round.id, (updated) => {
      setSolves(updated);
    });

    return () => {
      unsubRound();
      unsubSolves();
    };
  }, [round?.id]);

  // ── Fallback reveal when both IDs present but reveal event not yet received ─
  useEffect(() => {
    if (!round?.id) return;
    if (round.submittedUserIds.length < 2) return;
    if (showResult || revealingRef.current) return;
    if (round.status === "closed" || round.revealStatus === "revealed") return;

    // Both submitted but round not yet revealed — we may have missed the reveal event.
    // Call revealAndCloseRound (idempotent) and show result.
    revealingRef.current = true;
    const doReveal = async () => {
      try {
        await rubiksRepo.revealAndCloseRound(round.id);
      } catch {
        // Already revealed by the other device — that's fine
      }
      const allSolves = await rubiksRepo.getSolves(round.id);
      setResultSolves(allSolves);
      setShowResult(true);
    };
    doReveal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.submittedUserIds.length, round?.id, showResult]);

  // ── Timer logic ───────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    setTimerElapsed(0);
    setTimerRunning(true);
    const tick = () => {
      setTimerElapsed(Date.now() - timerStartRef.current);
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimer = useCallback(async () => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    const finalTime = Date.now() - timerStartRef.current;
    setTimerElapsed(finalTime);
    setTimerRunning(false);

    if (!round?.id || !currentUser?.id) return;

    try {
      await rubiksRepo.submitSolve(round.id, currentUser.id, finalTime);
      const updatedRound = await rubiksRepo.trackSolveSubmitted(round.id, currentUser.id);
      if (updatedRound) {
        setRound(updatedRound);
        if (updatedRound.submittedUserIds.length >= 2) {
          await rubiksRepo.revealAndCloseRound(round.id);
          const allSolves = await rubiksRepo.getSolves(round.id);
          setResultSolves(allSolves);
          setShowResult(true);
          // Notify both players of the winner
          if (couple?.id && currentUser?.id) {
            const validSolves = allSolves.filter((s) => !s.dnf);
            const winner = validSolves.length > 0
              ? validSolves.reduce((a, b) => a.timeMs < b.timeMs ? a : b)
              : null;
            const winnerName = winner
              ? (couple.members.find((m) => m.id === winner.userId)?.name ?? "Someone")
              : "Nobody";
            const winnerTime = winner ? formatMs(winner.timeMs) : "DNF";
            fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coupleId: couple.id,
                senderUserId: currentUser.id,
                sendToAll: true,
                message: `🏆 ${winnerName} won the cube challenge! (${winnerTime})`,
                url: `/rubiks/round/${round.id}`,
              }),
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error("Failed to submit solve:", e);
    }
  }, [round?.id, currentUser?.id]);

  // ── Join round ────────────────────────────────────────────
  const handleJoin = async () => {
    if (!round?.id || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const updated = await rubiksRepo.joinRound(round.id, currentUser.id);
      if (updated) setRound(updated);
    } catch (e) {
      console.error("Failed to join:", e);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  // ── Render states ─────────────────────────────────────────

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F3F1]">
        <CloudLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3F1] p-6 gap-4">
        <p
          className="text-[#292929] font-[family-name:var(--font-suse)] text-center"
          style={{ fontSize: 18, fontWeight: 700 }}
        >
          {loadError}
        </p>
        <button
          onClick={() => router.replace("/")}
          className="flex items-center gap-2 text-[#98989D] font-[family-name:var(--font-suse)]"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <IoArrowBack /> Go home
        </button>
      </div>
    );
  }

  if (!round || !currentUser || !couple) return null;

  const members = couple.members;
  const mySolve = solves.find((s) => s.userId === currentUser.id);
  const hasJoined = round.joinedUserIds.includes(currentUser.id);
  const myIndex = members.findIndex((m) => m.id === currentUser.id);

  // ── Result view ───────────────────────────────────────────
  if (showResult) {
    const validSolves = resultSolves.filter((s) => !s.dnf);
    const winner =
      validSolves.length >= 1
        ? validSolves.reduce((a, b) => (a.timeMs < b.timeMs ? a : b))
        : null;
    const winnerMember = winner ? members.find((m) => m.id === winner.userId) : null;
    const winnerIdx = winnerMember ? members.indexOf(winnerMember) : -1;

    return (
      <div className="flex min-h-screen flex-col bg-[#F4F3F1]">
        <div className="flex items-center px-5 pt-4 pb-2">
          <button onClick={() => router.replace("/")} className="text-[#98989D] hover:text-[#292929] transition-colors">
            <IoArrowBack style={{ fontSize: 22 }} />
          </button>
          <h1
            className="ml-3 text-[#292929] font-[family-name:var(--font-suse)]"
            style={{ fontSize: 22, fontWeight: 800 }}
          >
            Challenge Results
          </h1>
        </div>

        <div className="flex flex-col gap-4 px-4 pt-2 max-w-lg mx-auto w-full">
          {/* Winner banner */}
          {winnerMember && (
            <div
              className="flex items-center gap-3 bg-[#FEFEFE]"
              style={{ borderRadius: 18, padding: 16 }}
            >
              <IoCheckmarkCircle style={{ fontSize: 28, color: getPlayerColor(winnerIdx >= 0 ? winnerIdx : 0) }} />
              <div>
                <p
                  className="text-[#292929] font-[family-name:var(--font-suse)]"
                  style={{ fontSize: 18, fontWeight: 800 }}
                >
                  {winnerMember.id === currentUser.id ? "You won! 🎉" : `${winnerMember.name} won`}
                </p>
                {validSolves.length === 2 && (() => {
                  const [a, b] = validSolves.sort((x, y) => x.timeMs - y.timeMs);
                  const diff = formatMs(b.timeMs - a.timeMs);
                  return (
                    <p
                      className="text-[#98989D] font-[family-name:var(--font-suse)]"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      by {diff}
                    </p>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Times card */}
          <div
            className="bg-[#FEFEFE] flex flex-col gap-3"
            style={{ borderRadius: 18, padding: 16 }}
          >
            {members.map((member, i) => {
              const solve = resultSolves.find((s) => s.userId === member.id);
              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center text-white font-bold"
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: getPlayerColor(i), fontSize: 13,
                      }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (member.name?.charAt(0)?.toUpperCase() || "?")}
                    </div>
                    <span
                      className="text-[#292929] font-[family-name:var(--font-suse)]"
                      style={{ fontSize: 15, fontWeight: 700 }}
                    >
                      {member.name}
                      {member.id === currentUser.id && " (you)"}
                    </span>
                  </div>
                  <span
                    className="tabular-nums font-[family-name:var(--font-suse-mono)]"
                    style={{ fontSize: 18, fontWeight: 700, color: getPlayerColor(i) }}
                  >
                    {solve ? (solve.dnf ? "DNF" : formatMs(solve.timeMs)) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => router.replace("/")}
            className="w-full flex items-center justify-center font-[family-name:var(--font-suse)]
              bg-[#292929] text-white active:scale-[0.98] transition-all"
            style={{ borderRadius: 999, paddingTop: 18, paddingBottom: 18, fontSize: 18, fontWeight: 700 }}
          >
            Back to Log
          </button>
        </div>
      </div>
    );
  }

  // ── Join gate ─────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F4F3F1]">
        <div className="flex items-center px-5 pt-4 pb-2">
          <button onClick={() => router.replace("/")} className="text-[#98989D] hover:text-[#292929] transition-colors">
            <IoArrowBack style={{ fontSize: 22 }} />
          </button>
          <h1
            className="ml-3 text-[#292929] font-[family-name:var(--font-suse)]"
            style={{ fontSize: 22, fontWeight: 800 }}
          >
            ⚡ Async Challenge
          </h1>
        </div>

        <div className="flex flex-col gap-4 px-4 pt-2 max-w-lg mx-auto w-full">
          {/* Scramble (shown — partner needs to know the scramble) */}
          <div className="bg-[#FEFEFE]" style={{ borderRadius: 18, padding: 16 }}>
            <p
              className="text-[#98989D] font-[family-name:var(--font-suse)] uppercase mb-2"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
            >
              Your Scramble
            </p>
            <p
              className="text-[#292929] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 16, fontWeight: 700, lineHeight: "22px" }}
            >
              {round.scramble}
            </p>
          </div>

          <div className="bg-[#FEFEFE]" style={{ borderRadius: 18, padding: 16 }}>
            <p
              className="text-[#292929] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              Scramble your cube, then accept to start your timer. Your time will be hidden until your partner also submits.
            </p>
          </div>

          <button
            onClick={handleJoin}
            disabled={actionLoading}
            className="w-full flex items-center justify-center font-[family-name:var(--font-suse)]
              bg-[#292929] text-white active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ borderRadius: 999, paddingTop: 20, paddingBottom: 20, fontSize: 20, fontWeight: 700 }}
          >
            {actionLoading ? "Joining..." : "🏋 Accept Challenge"}
          </button>
        </div>
      </div>
    );
  }

  // ── Timer + submit view ───────────────────────────────────

  // Fullscreen timer overlay
  if (timerRunning) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none"
        style={{ backgroundColor: "#E53E3E" }}
        onClick={stopTimer}
      >
        <p
          className="text-white tabular-nums font-[family-name:var(--font-suse)]"
          style={{ fontSize: 72, fontWeight: 800 }}
        >
          {formatMsDisplay(timerElapsed)}
        </p>
        <p
          className="text-white/70 font-[family-name:var(--font-suse)]"
          style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}
        >
          Tap anywhere to stop
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3F1]">
      <div className="flex items-center px-5 pt-4 pb-2">
        <button onClick={() => router.replace("/")} className="text-[#98989D] hover:text-[#292929] transition-colors">
          <IoArrowBack style={{ fontSize: 22 }} />
        </button>
        <h1
          className="ml-3 text-[#292929] font-[family-name:var(--font-suse)]"
          style={{ fontSize: 22, fontWeight: 800 }}
        >
          ⚡ Async Challenge
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-2 max-w-lg mx-auto w-full pb-8">

        {/* Scramble */}
        <div className="bg-[#FEFEFE]" style={{ borderRadius: 18, padding: 16 }}>
          <p
            className="text-[#98989D] font-[family-name:var(--font-suse)] uppercase mb-2"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
          >
            Scramble
          </p>
          <p
            className="text-[#292929] font-[family-name:var(--font-suse)]"
            style={{ fontSize: 16, fontWeight: 700, lineHeight: "22px" }}
          >
            {round.scramble}
          </p>
        </div>

        {/* Solve slots */}
        <div className="flex gap-3">
          {members.map((member, i) => {
            const solve = solves.find((s) => s.userId === member.id);
            const submitted = round.submittedUserIds.includes(member.id);
            const isMe = member.id === currentUser.id;
            return (
              <div
                key={member.id}
                className="flex-1 flex flex-col items-center gap-2 bg-[#FEFEFE]"
                style={{
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor: submitted ? getPlayerColor(i) : "rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex items-center justify-center text-white font-bold"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: getPlayerColor(i), fontSize: 14 }}
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                  ) : (member.name?.charAt(0)?.toUpperCase() || "?")}
                </div>
                <span
                  className="text-[#292929] font-[family-name:var(--font-suse)] uppercase"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {member.name}{isMe ? " (you)" : ""}
                </span>
                {solve ? (
                  <span
                    className="tabular-nums font-[family-name:var(--font-suse)]"
                    style={{ fontSize: 22, fontWeight: 800, color: getPlayerColor(i) }}
                  >
                    {solve.dnf ? "DNF" : formatMs(solve.timeMs)}
                  </span>
                ) : submitted ? (
                  <span
                    className="font-[family-name:var(--font-suse)]"
                    style={{ fontSize: 13, fontWeight: 600, color: getPlayerColor(i) }}
                  >
                    Submitted ✓
                  </span>
                ) : (
                  <span
                    className="text-[#98989D] italic font-[family-name:var(--font-suse)]"
                    style={{ fontSize: 14 }}
                  >
                    Waiting…
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Timer display */}
        {!mySolve && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p
              className="tabular-nums text-[#292929] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 64, fontWeight: 800 }}
            >
              {formatMsDisplay(timerElapsed)}
            </p>
          </div>
        )}

        {/* Start Timer / Waiting */}
        {!mySolve ? (
          <button
            onClick={startTimer}
            className="w-full flex items-center justify-center gap-2 text-white font-[family-name:var(--font-suse-mono)]
              bg-[#292929] hover:bg-[#1A1A1A] active:scale-[0.98] transition-all"
            style={{ borderRadius: 999, paddingTop: 20, paddingBottom: 20, fontSize: 22, fontWeight: 600 }}
          >
            Start Timer
          </button>
        ) : round.submittedUserIds.length < 2 ? (
          <div
            className="w-full flex flex-col items-center gap-2 bg-[#FEFEFE]"
            style={{ borderRadius: 18, padding: 16 }}
          >
            <p
              className="text-[#292929] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 15, fontWeight: 700 }}
            >
              Your time: {formatMs(mySolve.timeMs)}
            </p>
            <p
              className="text-[#98989D] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              Waiting for your partner to submit…
            </p>
          </div>
        ) : (
          /* Both submitted — revealing results */
          <div className="w-full flex flex-col items-center gap-2 py-2">
            <p
              className="text-[#292929] font-[family-name:var(--font-suse)] animate-pulse"
              style={{ fontSize: 15, fontWeight: 700 }}
            >
              Revealing results…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
