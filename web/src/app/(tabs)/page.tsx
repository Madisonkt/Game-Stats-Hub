"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-context";
import * as rubiksRepo from "@/lib/repos/rubiksRepo";
import type { Round, Solve, User } from "@/lib/models";
import { getPartnerUser } from "@/lib/models";
import { generateScramble } from "@/lib/scramble";
import {
  IoPlay,
  IoRefresh,
  IoCheckmarkCircle,
  IoCopy,
  IoCloseCircle,
} from "react-icons/io5";
import ConfettiEffect from "@/components/ConfettiEffect";
import UndoToast from "@/components/UndoToast";

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

const GRADIENT_A = "linear-gradient(160deg, #F5D5C8, #F0B89E, #E8956E, #E07850, #D4628A)";
const GRADIENT_B = "linear-gradient(160deg, #A8C8F0, #88BDE8, #6CB4EE, #7DD4D4, #90DBC8)";

function getPlayerColor(index: number): string {
  return index === 0 ? "#D4628A" : "#3A7BD5";
}

function getPlayerGradient(index: number): string {
  return index === 0 ? GRADIENT_A : GRADIENT_B;
}

// Crown SVG component (matches Expo exactly: 28×22)
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg width={28} height={22} viewBox="0 0 24 20" fill="none" className={className}>
      <path
        d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z"
        fill="rgba(255,255,255,0.85)"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Score Card ──────────────────────────────────────────────

function ScoreCard({
  name,
  score,
  color,
  gradient,
  avatarUrl,
  initial,
  isLeading,
}: {
  name: string;
  score: number;
  color: string;
  gradient: string;
  avatarUrl?: string;
  initial: string;
  isLeading: boolean;
}) {
  return (
    <div
      className="flex-1 relative overflow-hidden grain-overlay score-card-hover"
      style={{
        background: gradient,
        borderRadius: 22,
        padding: 14,
        paddingTop: 34,
      }}
    >
      <div className="relative z-10 flex flex-row items-center gap-2.5">
        {/* Avatar column */}
        <div className="relative flex flex-col items-center" style={{ overflow: "visible" }}>
          {isLeading && (
            <div className="absolute" style={{ top: -24, zIndex: 1 }}>
              <CrownIcon />
            </div>
          )}
          <div
            className="flex items-center justify-center"
            style={{
              width: 60,
              height: 82,
              borderRadius: 30,
              borderWidth: 2.5,
              borderStyle: "solid",
              borderColor: "rgba(255,255,255,0.6)",
            }}
          >
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: 50,
                height: 72,
                borderRadius: 25,
                backgroundColor: color,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="object-cover"
                  style={{ width: 50, height: 72, borderRadius: 25 }}
                />
              ) : (
                <span
                  className="text-white font-[family-name:var(--font-nunito)]"
                  style={{ fontSize: 20, fontWeight: 800 }}
                >
                  {initial}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Name + score column */}
        <div className="flex-1 flex flex-col items-start gap-0.5">
          <span
            className="font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}
          >
            {name}
          </span>
          <span
            className="text-white font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 48, fontWeight: 800, lineHeight: "52px" }}
          >
            {score}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Scramble Card ───────────────────────────────────────────

function ScrambleCard({
  scramble,
  onNewScramble,
  onCopy,
}: {
  scramble: string;
  onNewScramble?: () => void;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scramble);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="w-full bg-[#ECE7DE] dark:bg-[#1A1A1C]"
      style={{ borderRadius: 18, padding: 14 }}
    >
      <p
        className="text-[#98989D] font-[family-name:var(--font-nunito)] mb-1.5"
        style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}
      >
        Scramble
      </p>
      <p
        className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
        style={{ fontSize: 17, fontWeight: 700, lineHeight: "26px" }}
      >
        {scramble}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[#98989D] hover:text-[#636366] transition-colors"
        >
          <IoCopy className="text-sm" />
          <span className="text-xs font-semibold font-[family-name:var(--font-nunito)]">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
        {onNewScramble && (
          <button
            onClick={onNewScramble}
            className="flex items-center gap-1 text-[#98989D] hover:text-[#636366] transition-colors"
          >
            <IoRefresh className="text-sm" />
            <span className="text-xs font-semibold font-[family-name:var(--font-nunito)]">
              New Scramble
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export default function LogPage() {
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  // Round + solve state
  const [round, setRound] = useState<Round | null>(null);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<number>(0);

  // Score tracking
  const [scores, setScores] = useState<Record<string, number>>({});
  const [totalRounds, setTotalRounds] = useState(0);

  // Confetti + undo
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiColor, setConfettiColor] = useState<string | undefined>();
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  const [lastClosedRoundId, setLastClosedRoundId] = useState<string | null>(null);

  // Cat overlay
  const [showCat, setShowCat] = useState(false);

  // Track rounds that already triggered confetti (prevent duplicates from polling)
  const confettiFiredRef = useRef<Set<string>>(new Set());

  // ── Compute scores helper ─────────────────────────────────
  const computeScores = useCallback(
    async (coupleId: string) => {
      const [allRounds, allSolves] = await Promise.all([
        rubiksRepo.getAllRounds(coupleId),
        rubiksRepo.getAllSolves(coupleId),
      ]);
      const closed = allRounds.filter((r) => r.status === "closed");
      setTotalRounds(closed.length);
      const scoreMap: Record<string, number> = {};
      for (const cr of closed) {
        const rSolves = allSolves.filter(
          (s) => s.roundId === cr.id && !s.dnf
        );
        if (rSolves.length === 2) {
          const winner = rSolves.reduce((a, b) =>
            a.timeMs < b.timeMs ? a : b
          );
          scoreMap[winner.userId] = (scoreMap[winner.userId] || 0) + 1;
        }
      }
      setScores(scoreMap);
    },
    []
  );

  // ── Close round + fire confetti helper ────────────────────
  const handleRoundComplete = useCallback(
    async (roundId: string, roundSolves: Solve[]) => {
      // Only fire once per round
      if (confettiFiredRef.current.has(roundId)) return;
      confettiFiredRef.current.add(roundId);

      try {
        await rubiksRepo.closeRound(roundId);
      } catch {
        // May already be closed by the other player's device
      }

      if (couple?.id) {
        await computeScores(couple.id);

        const validSolves = roundSolves.filter((s) => !s.dnf);
        if (validSolves.length === 2) {
          const winner = validSolves.reduce((a, b) =>
            a.timeMs < b.timeMs ? a : b
          );
          const winnerIdx = couple.members.findIndex(
            (m) => m.id === winner.userId
          );
          const winnerMember = couple.members[winnerIdx];

          // Confetti only on the WINNER's screen
          if (winner.userId === currentUser?.id) {
            setConfettiColor(getPlayerColor(winnerIdx));
            setConfettiTrigger((t) => t + 1);
          }

          setUndoMessage(`+1 for ${winnerMember?.name || "Player"}`);
          setUndoVisible(true);
          setLastClosedRoundId(roundId);

          // Cat overlay on BOTH screens when player B (index 1) wins
          if (winnerIdx === 1) {
            setShowCat(true);
            setTimeout(() => setShowCat(false), 2600);
          }
        }
      }
    },
    [couple?.id, couple?.members, computeScores]
  );

  // ── Load active round + scores on mount ───────────────────
  useEffect(() => {
    if (!couple?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const activeRound = await rubiksRepo.getActiveRound(couple.id);
        setRound(activeRound);
        if (activeRound) {
          const roundSolves = await rubiksRepo.getSolves(activeRound.id);
          setSolves(roundSolves);
        }
        await computeScores(couple.id);
      } catch (e) {
        console.error("Failed to load round data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [couple?.id, computeScores]);

  // ── Poll every 3s for updates (rounds, solves, scores) ────
  useEffect(() => {
    if (!couple?.id) return;
    const poll = async () => {
      // Don't poll while timer is running (avoid UI jank)
      if (timerRef.current) return;
      try {
        const activeRound = await rubiksRepo.getActiveRound(couple.id);
        setRound(activeRound);
        if (activeRound) {
          const roundSolves = await rubiksRepo.getSolves(activeRound.id);
          setSolves(roundSolves);
          // Check if round should be closed (both players submitted)
          if (activeRound.status === "in_progress" && roundSolves.length >= 2) {
            await handleRoundComplete(activeRound.id, roundSolves);
          }
        }
        await computeScores(couple.id);
      } catch (e) {
        // Silently ignore polling errors
      }
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [couple?.id, computeScores, handleRoundComplete]);

  // ── Realtime: subscribe to rounds ─────────────────────────
  useEffect(() => {
    if (!couple?.id) return;
    const unsub = rubiksRepo.subscribeToRounds(couple.id, (updatedRound) => {
      setRound(updatedRound);
      if (updatedRound) {
        rubiksRepo.getSolves(updatedRound.id).then(setSolves);
      } else {
        setSolves([]);
      }
    });
    return () => unsub();
  }, [couple?.id]);

  // ── Realtime: subscribe to solves ─────────────────────────
  useEffect(() => {
    if (!round?.id) return;
    const unsub = rubiksRepo.subscribeToSolves(round.id, (updatedSolves) => {
      setSolves(updatedSolves);
      if (round.status === "in_progress" && updatedSolves.length >= 2) {
        handleRoundComplete(round.id, updatedSolves);
      }
    });
    return () => unsub();
  }, [round?.id, round?.status, handleRoundComplete]);

  // ── Timer logic ───────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    setTimerElapsed(0);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerElapsed(Date.now() - timerStartRef.current);
    }, 10);
  }, []);

  const stopTimer = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalTime = Date.now() - timerStartRef.current;
    setTimerElapsed(finalTime);
    setTimerRunning(false);
    if (round?.id && currentUser?.id) {
      try {
        await rubiksRepo.submitSolve(round.id, currentUser.id, finalTime);
      } catch (e) {
        console.error("Failed to submit solve:", e);
      }
    }
  }, [round?.id, currentUser?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const handleCreateRound = async () => {
    if (!couple?.id || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const newRound = await rubiksRepo.createRound(couple.id, currentUser.id);
      setRound(newRound);
      setSolves([]);
      setTimerElapsed(0);
    } catch (e) {
      console.error("Failed to create round:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRound = async () => {
    if (!round?.id || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const updated = await rubiksRepo.joinRound(round.id, currentUser.id);
      if (updated) setRound(updated);
    } catch (e) {
      console.error("Failed to join round:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRound = async () => {
    if (!round?.id) return;
    try {
      await rubiksRepo.closeRound(round.id);
      setRound(null);
      setSolves([]);
    } catch (e) {
      console.error("Failed to cancel round:", e);
    }
  };

  const handleResetSolve = async () => {
    if (!round?.id || !currentUser?.id) return;
    try {
      await rubiksRepo.resetSolve(round.id, currentUser.id);
      setTimerElapsed(0);
    } catch (e) {
      console.error("Failed to reset solve:", e);
    }
  };

  // ── Guard: no couple ──────────────────────────────────────
  if (!couple || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
          Join or create a room first
        </p>
      </div>
    );
  }

  const members = couple.members;
  const mySolve = solves.find((s) => s.userId === currentUser.id);

  // ── Compute status text ───────────────────────────────────
  const scoreA = scores[members[0]?.id] || 0;
  const scoreB = scores[members[1]?.id] || 0;
  let statusText = "";
  if (scoreA === 0 && scoreB === 0) {
    statusText = "No wins yet";
  } else if (scoreA === scoreB) {
    statusText = "Tied!";
  } else {
    const leader = scoreA > scoreB ? members[0]?.name : members[1]?.name;
    const diff = Math.abs(scoreA - scoreB);
    statusText = `${leader} leads by ${diff}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#3A7BD5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 pt-4 pb-2 max-w-lg mx-auto">
      {/* Confetti */}
      <ConfettiEffect trigger={confettiTrigger} winnerColor={confettiColor} />

      {/* Undo Toast */}
      <UndoToast
        message={undoMessage}
        visible={undoVisible}
        color={confettiColor}
        onUndo={async () => {
          if (lastClosedRoundId) {
            try {
              await rubiksRepo.undoRound(lastClosedRoundId);
              if (couple?.id) await computeScores(couple.id);
              setRound(null);
              setSolves([]);
            } catch (e) {
              console.error("Undo failed:", e);
            }
          }
          setUndoVisible(false);
        }}
        onDismiss={() => setUndoVisible(false)}
      />

      {/* Cat overlay */}
      {showCat && (
        <div
          className="fixed inset-0 z-[180] pointer-events-none overflow-hidden"
          style={{ backgroundColor: "#000" }}
        >
          <img
            src="/images/cat.png"
            alt="Cat celebration"
            className="cat-overlay"
            style={{
              position: "absolute",
              top: 0,
              left: "-10%",
              width: "120%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* ── Header title ────────────────────────────── */}
      <h1
        className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] mb-4"
        style={{ fontSize: 22, fontWeight: 800 }}
      >
        Rubik&apos;s Cube
      </h1>

      {/* ── Scoreboard ──────────────────────────────── */}
      <div className="flex w-full gap-2.5 mb-3">
        {members.map((member, i) => {
          const score = scores[member.id] || 0;
          const otherScore = scores[members[1 - i]?.id] || 0;
          return (
            <ScoreCard
              key={member.id}
              name={member.name || "Player"}
              score={score}
              color={getPlayerColor(i)}
              gradient={getPlayerGradient(i)}
              avatarUrl={member.avatarUrl}
              initial={member.name?.charAt(0)?.toUpperCase() || "?"}
              isLeading={score > 0 && score > otherScore}
            />
          );
        })}
      </div>

      {/* ── Status text ─────────────────────────────── */}
      <p
        className="text-[#98989D] font-[family-name:var(--font-nunito)] mb-4 text-center"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        {statusText}
      </p>

      {/* ── FULLSCREEN TIMER OVERLAY ────────────────── */}
      {timerRunning && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none"
          style={{ backgroundColor: "#E53E3E" }}
          onClick={stopTimer}
        >
          <p
            className="text-white tabular-nums font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 72, fontWeight: 800 }}
          >
            {formatMsDisplay(timerElapsed)}
          </p>
          <p
            className="text-white/70 font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}
          >
            Tap anywhere to stop
          </p>
        </div>
      )}

      {/* ── NO ACTIVE ROUND ─────────────────────────── */}
      {!round && (
        <div className="w-full flex flex-col items-center gap-4">
          <button
            onClick={handleCreateRound}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 text-white font-[family-name:var(--font-nunito)]
              bg-[#3A7BD5] hover:bg-[#2C5F9E] active:scale-[0.98] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderRadius: 999,
              paddingLeft: 56,
              paddingRight: 56,
              paddingTop: 20,
              paddingBottom: 20,
              fontSize: 22,
              fontWeight: 800,
              minWidth: 220,
            }}
          >
            <IoPlay />
            {actionLoading ? "Creating..." : "Start Round"}
          </button>
        </div>
      )}

      {/* ── ROUND: OPEN (join gate) ─────────────────── */}
      {round && round.status === "open" && (
        <div className="w-full flex flex-col gap-4">
          <ScrambleCard scramble={round.scramble} />

          <p
            className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            Waiting for both players to join...
          </p>

          <div className="flex gap-3">
            {members.map((member, i) => {
              const joined = round.joinedUserIds.includes(member.id);
              const isMe = member.id === currentUser.id;
              return (
                <div
                  key={member.id}
                  className="flex-1 flex flex-col items-center gap-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]"
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 2,
                    borderStyle: joined ? "solid" : "dashed",
                    borderColor: joined ? getPlayerColor(i) : "rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white font-bold"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: getPlayerColor(i),
                      fontSize: 14,
                    }}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.name?.charAt(0)?.toUpperCase() || "?"
                    )}
                  </div>
                  <span
                    className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {member.name}
                  </span>
                  {joined ? (
                    <IoCheckmarkCircle style={{ fontSize: 20, color: getPlayerColor(i) }} />
                  ) : isMe ? (
                    <button
                      onClick={handleJoinRound}
                      disabled={actionLoading}
                      className="font-bold text-[#3A7BD5] hover:underline disabled:opacity-50 font-[family-name:var(--font-nunito)]"
                      style={{ fontSize: 13 }}
                    >
                      Tap to Join
                    </button>
                  ) : (
                    <span
                      className="text-[#98989D] font-[family-name:var(--font-nunito)]"
                      style={{ fontSize: 13 }}
                    >
                      Waiting...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cancel round link */}
          <button
            onClick={handleCancelRound}
            className="text-[#98989D] hover:text-[#636366] transition-colors font-[family-name:var(--font-nunito)] underline self-center"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Cancel round
          </button>
        </div>
      )}

      {/* ── ROUND: IN PROGRESS ──────────────────────── */}
      {round && round.status === "in_progress" && (
        <div className="w-full flex flex-col gap-4">
          <ScrambleCard scramble={round.scramble} />

          {/* Solve slots */}
          <div className="flex gap-3">
            {members.map((member, i) => {
              const solve = solves.find((s) => s.userId === member.id);
              return (
                <div
                  key={member.id}
                  className="flex-1 flex flex-col items-center gap-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]"
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: solve ? getPlayerColor(i) : "rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white font-bold"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: getPlayerColor(i),
                      fontSize: 14,
                    }}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.name?.charAt(0)?.toUpperCase() || "?"
                    )}
                  </div>
                  <span
                    className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] uppercase"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {member.name}
                  </span>
                  {solve ? (
                    <span
                      className="tabular-nums font-[family-name:var(--font-nunito)]"
                      style={{ fontSize: 22, fontWeight: 800, color: getPlayerColor(i) }}
                    >
                      {solve.dnf ? "DNF" : formatMs(solve.timeMs)}
                    </span>
                  ) : (
                    <span
                      className="text-[#98989D] italic font-[family-name:var(--font-nunito)]"
                      style={{ fontSize: 14 }}
                    >
                      Waiting…
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timer display (inline, not fullscreen) */}
          {!timerRunning && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <p
                className="tabular-nums text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
                style={{ fontSize: 64, fontWeight: 800 }}
              >
                {formatMsDisplay(timerElapsed)}
              </p>
            </div>
          )}

          {/* Timer controls */}
          {!mySolve && !timerRunning && (
            <button
              onClick={startTimer}
              className="flex items-center justify-center gap-2 text-white font-[family-name:var(--font-nunito)]
                bg-[#3A7BD5] hover:bg-[#2C5F9E] active:scale-[0.98] transition-all self-center"
              style={{
                borderRadius: 999,
                paddingLeft: 56,
                paddingRight: 56,
                paddingTop: 20,
                paddingBottom: 20,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Start Timer
            </button>
          )}

          {mySolve && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-green-600 font-semibold font-[family-name:var(--font-nunito)]">
                Your time: {formatMs(mySolve.timeMs)}
              </p>
              <button
                onClick={handleResetSolve}
                className="flex items-center gap-1 text-xs text-[#98989D] hover:text-red-500 transition-colors font-[family-name:var(--font-nunito)]"
              >
                <IoRefresh />
                Reset my solve
              </button>
            </div>
          )}

          {/* Cancel round */}
          <button
            onClick={handleCancelRound}
            className="text-[#98989D] hover:text-[#636366] transition-colors font-[family-name:var(--font-nunito)] underline self-center"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Cancel round
          </button>
        </div>
      )}

      {/* ── ROUND: CLOSED ───────────────────────────── */}
      {round && round.status === "closed" && (
        <div className="w-full flex flex-col items-center gap-4">
          <RoundResults members={members} solves={solves} />
          <button
            onClick={handleCreateRound}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 text-white font-[family-name:var(--font-nunito)]
              bg-[#3A7BD5] hover:bg-[#2C5F9E] active:scale-[0.98] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderRadius: 999,
              paddingLeft: 56,
              paddingRight: 56,
              paddingTop: 20,
              paddingBottom: 20,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <IoRefresh className="text-xl" />
            {actionLoading ? "Creating..." : "New Round"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function RoundResults({
  members,
  solves,
}: {
  members: User[];
  solves: Solve[];
}) {
  const validSolves = solves.filter((s) => !s.dnf);
  const winner =
    validSolves.length === 2
      ? validSolves.reduce((a, b) => (a.timeMs < b.timeMs ? a : b))
      : null;
  const winnerMember = winner
    ? members.find((m) => m.id === winner.userId)
    : null;
  const winnerIdx = winnerMember ? members.indexOf(winnerMember) : -1;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <IoCheckmarkCircle className="text-green-500" style={{ fontSize: 24 }} />
        <h2
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
          style={{ fontSize: 20, fontWeight: 800 }}
        >
          Round Complete!
        </h2>
      </div>

      {winnerMember && (
        <p
          className="font-[family-name:var(--font-nunito)]"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: getPlayerColor(winnerIdx),
          }}
        >
          {winnerMember.name} wins!
        </p>
      )}

      <div className="flex gap-3 w-full">
        {members.map((member, i) => {
          const solve = solves.find((s) => s.userId === member.id);
          const isWinner = winner?.userId === member.id;
          return (
            <div
              key={member.id}
              className="flex-1 flex flex-col items-center gap-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]"
              style={{
                borderRadius: 16,
                padding: 14,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: isWinner ? "#EAB308" : "rgba(0,0,0,0.06)",
              }}
            >
              {isWinner && <CrownIcon />}
              <div
                className="flex items-center justify-center text-white font-bold"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: getPlayerColor(i),
                  fontSize: 14,
                }}
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  member.name?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
              <span
                className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {member.name}
              </span>
              <span
                className="tabular-nums font-[family-name:var(--font-nunito)]"
                style={{ fontSize: 22, fontWeight: 800, color: getPlayerColor(i) }}
              >
                {solve ? (solve.dnf ? "DNF" : formatMs(solve.timeMs)) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
