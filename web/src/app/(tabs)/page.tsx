"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/lib/auth-context";
import { useGames } from "@/lib/game-context";
import * as rubiksRepo from "@/lib/repos/rubiksRepo";
import type { Round, Solve, User } from "@/lib/models";
import {
  IoPlay,
  IoRefresh,
  IoCheckmarkCircle,
  IoCopy,
} from "react-icons/io5";

const ConfettiEffect = dynamic(() => import("@/components/ConfettiEffect"), { ssr: false });
const UndoToast = dynamic(() => import("@/components/UndoToast"), { ssr: false });

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
  return index === 0 ? "#E07850" : "#3A7BD5";
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

// ── Game Filter Pills ───────────────────────────────────────

function GameFilterPills({
  games,
  activeGame,
  setActiveGameId,
}: {
  games: import("@/lib/models").Game[];
  activeGame: import("@/lib/models").Game | null;
  setActiveGameId: (id: string) => void;
}) {
  const activeGames = games.filter((g) => !g.isArchived);

  if (activeGames.length <= 1) {
    // Single game — just show the name
    return (
      <h1
        className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] mb-4"
        style={{ fontSize: 22, fontWeight: 800 }}
      >
        {activeGame?.name ?? "No Game"}
      </h1>
    );
  }

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
      {activeGames.map((game) => {
        const isActive = game.id === activeGame?.id;
        return (
          <button
            key={game.id}
            onClick={() => setActiveGameId(game.id)}
            className={`whitespace-nowrap font-[family-name:var(--font-suse)] active:scale-[0.95] transition-all ${
              isActive
                ? "bg-[#0A0A0C] dark:bg-[#F3F0EA] text-white dark:text-[#0A0A0C]"
                : "bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]"
            }`}
            style={{
              borderRadius: 999,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 15,
              fontWeight: isActive ? 700 : 600,
            }}
          >
            {game.name}
          </button>
        );
      })}
    </div>
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
        borderRadius: 0,
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
                  className="text-white font-[family-name:var(--font-suse)]"
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
            className="font-[family-name:var(--font-suse)]"
            style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}
          >
            {name}
          </span>
          <span
            className="text-white font-[family-name:var(--font-suse)]"
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

import CubePreview from "@/components/CubePreview";

function ScrambleCard({
  scramble,
  onNewScramble,
}: {
  scramble: string;
  onNewScramble?: () => void;
}) {
  return (
    <div
      className="w-full bg-[#ECE7DE] dark:bg-[#1A1A1C]"
      style={{ borderRadius: 0, padding: 14 }}
    >
      <p
        className="text-[#98989D] font-[family-name:var(--font-suse)] mb-1.5"
        style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}
      >
        Scramble
      </p>

      {/* Scramble text + 3D Cube */}
      <div className="flex items-center gap-3">
        <p
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] flex-1"
          style={{ fontSize: 15, fontWeight: 700, lineHeight: "22px" }}
        >
          {scramble}
        </p>
        <div className="shrink-0" style={{ marginRight: -8, marginTop: -8, marginBottom: -8 }}>
          <CubePreview scramble={scramble} />
        </div>
      </div>

      {onNewScramble && (
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onNewScramble}
            className="flex items-center gap-1 text-[#98989D] hover:text-[#636366] transition-colors"
          >
            <IoRefresh className="text-sm" />
            <span className="text-xs font-semibold font-[family-name:var(--font-suse)]">
              New Scramble
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export default function LogPage() {
  const { session } = useSession();
  const { games, activeGame, setActiveGameId } = useGames();
  const couple = session.couple;
  const currentUser = session.currentUser;
  const gameKey = activeGame?.id ?? "rubiks";
  const isTimed = activeGame ? activeGame.type === "timed" : true;

  // Round + solve state
  const [round, setRound] = useState<Round | null>(null);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
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
    async (coupleId: string, gk: string) => {
      const [allRounds, allSolves] = await Promise.all([
        rubiksRepo.getAllRounds(coupleId, gk),
        rubiksRepo.getAllSolves(coupleId, gk),
      ]);
      const closed = allRounds.filter((r) => r.status === "closed");
      setTotalRounds(closed.length);
      const scoreMap: Record<string, number> = {};
      for (const cr of closed) {
        const rSolves = allSolves.filter(
          (s) => s.roundId === cr.id && !s.dnf
        );
        if (rSolves.length >= 1) {
          const winner = rSolves.reduce((a, b) =>
            a.timeMs < b.timeMs ? a : b
          );
          scoreMap[winner.userId] = (scoreMap[winner.userId] || 0) + 1;
        }
      }
      setScores(scoreMap);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
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
        await computeScores(couple.id, gameKey);

        const validSolves = roundSolves.filter((s) => !s.dnf);
        if (validSolves.length >= 1) {
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

          // Cat overlay on BOTH screens when player A (index 0) wins
          if (winnerIdx === 0) {
            setShowCat(true);
            setTimeout(() => setShowCat(false), 2600);
          }
        }
      }
    },
    [couple?.id, couple?.members, computeScores, gameKey]
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
        const activeRound = await rubiksRepo.getActiveRound(couple.id, gameKey);
        setRound(activeRound);
        if (activeRound) {
          const roundSolves = await rubiksRepo.getSolves(activeRound.id);
          setSolves(roundSolves);
        }
        await computeScores(couple.id, gameKey);
      } catch (e) {
        console.error("Failed to load round data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [couple?.id, computeScores, gameKey]);

  // Polling removed — realtime subscriptions handle updates

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
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  // ── Reset timer when a new round appears ─────────────────
  const prevRoundIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (round?.id && round.id !== prevRoundIdRef.current) {
      prevRoundIdRef.current = round.id;
      // Always reset timer for new round (regardless of timer state)
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      setTimerElapsed(0);
      setTimerRunning(false);
    } else if (!round) {
      // Round was cleared (after completion) — reset timer
      prevRoundIdRef.current = null;
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      setTimerElapsed(0);
      setTimerRunning(false);
    }
  }, [round?.id]);

  // ── Actions ───────────────────────────────────────────────
  const handleCreateRound = async () => {
    if (!couple?.id || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const newRound = await rubiksRepo.createRound(couple.id, currentUser.id, gameKey);
      // For simple games, auto-join both players so we skip the "open" gate
      if (!isTimed && couple.members.length >= 2) {
        const otherMember = couple.members.find((m) => m.id !== currentUser.id);
        if (otherMember) {
          // Join current user
          await rubiksRepo.joinRound(newRound.id, currentUser.id);
          // Join partner
          const updated = await rubiksRepo.joinRound(newRound.id, otherMember.id);
          if (updated) {
            setRound(updated);
            setSolves([]);
            setTimerElapsed(0);
            setActionLoading(false);
            return;
          }
        }
      }
      setRound(newRound);
      setSolves([]);
      setTimerElapsed(0);

      // Send push notification to partner
      try {
        const playerName = currentUser.name || "Your partner";
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coupleId: couple.id,
            senderUserId: currentUser.id,
            senderName: playerName,
            message: `${playerName} wants to rubiks cube pls`,
          }),
        });
      } catch {
        // Push notification is best-effort, don't block on failure
      }
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
      setTimerElapsed(0);
      setTimerRunning(false);
      if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
    } catch (e) {
      console.error("Failed to join round:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // Simple game: "I Won" immediately submits a fake solve with time=1ms for the winner
  const handleSimpleWin = async (winnerId: string) => {
    if (!round?.id || !couple?.id) return;
    setActionLoading(true);
    try {
      // Submit a 1ms solve for the winner (we just need a winner, time doesn't matter)
      await rubiksRepo.submitSolve(round.id, winnerId, 1);
      // Submit a 2ms solve for the other player so the round auto-closes
      const otherMember = couple.members.find((m) => m.id !== winnerId);
      if (otherMember) {
        await rubiksRepo.submitSolve(round.id, otherMember.id, 2);
      }
      // Directly trigger round completion instead of relying on realtime
      // (the two rapid-fire inserts can race and miss the subscription)
      const completedSolves = await rubiksRepo.getSolves(round.id);
      await handleRoundComplete(round.id, completedSolves);
    } catch (e) {
      console.error("Failed to record win:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRound = async () => {
    if (!round?.id) return;
    try {
      await rubiksRepo.deleteRound(round.id);
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
        <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-suse)]">
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
      <div className="flex flex-col items-center px-5 pt-4 pb-2 max-w-lg mx-auto">
        {/* Game name */}
        <h1
          className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] mb-4"
          style={{ fontSize: 22, fontWeight: 800 }}
        >
          {activeGame?.name ?? "No Game"}
        </h1>

        {/* Skeleton score cards */}
        <div className="flex w-full gap-2.5 mb-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex-1 animate-pulse"
              style={{
                background: i === 0
                  ? "linear-gradient(135deg, #3A3A3C, #2C2C2E)"
                  : "linear-gradient(135deg, #2C2C2E, #3A3A3C)",
                borderRadius: 0,
                padding: 14,
                paddingTop: 34,
              }}
            >
              <div className="flex flex-row items-center gap-2.5">
                <div
                  style={{
                    width: 60,
                    height: 82,
                    borderRadius: 30,
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
                <div className="flex-1 flex flex-col gap-2">
                  <div
                    style={{
                      width: 60,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: "rgba(255,255,255,0.25)",
                    }}
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: "rgba(255,255,255,0.2)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton status text */}
        <div
          className="w-full bg-[#ECE7DE] dark:bg-[#1A1A1C] mb-4 animate-pulse"
          style={{ borderRadius: 0, padding: 14 }}
        >
          <div
            style={{
              width: 120,
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(0,0,0,0.08)",
            }}
            className="dark:!bg-white/10"
          />
        </div>

        {/* Skeleton round area */}
        <div
          className="w-full bg-[#ECE7DE] dark:bg-[#1A1A1C] animate-pulse"
          style={{ borderRadius: 0, padding: 24, height: 120 }}
        />
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
              if (couple?.id) await computeScores(couple.id, gameKey);
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
            src="/images/cat-small.jpg"
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

      {/* ── Header title — game name (hidden during round) ── */}
      {!round && (
        <h1
          className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] mb-4"
          style={{ fontSize: 22, fontWeight: 800 }}
        >
          {activeGame?.name ?? "No Game"}
        </h1>
      )}

      {/* ── Scoreboard (only when no active round) ──── */}
      {!round && (
        <>
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
          <div
            className="w-full bg-[#ECE7DE] dark:bg-[#1A1A1C] mb-4"
            style={{ borderRadius: 0, padding: 14 }}
          >
            <p
              className="text-[#98989D] font-[family-name:var(--font-suse)] text-left"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {statusText}
            </p>
          </div>
        </>
      )}

      {/* ── FULLSCREEN TIMER OVERLAY ────────────────── */}
      {timerRunning && (
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
      )}

      {/* ── NO ACTIVE ROUND ─────────────────────────── */}
      {!round && (
        <div className="w-full flex flex-col items-center gap-4">
          <button
            onClick={handleCreateRound}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 text-white dark:text-[#0A0A0C] font-[family-name:var(--font-suse)]
              bg-[#3A7BD5] dark:bg-white hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all
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
          {/* Header */}
          <h2
            className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
            style={{ fontSize: 20, fontWeight: 800 }}
          >
            Game in Progress
          </h2>

          <ScrambleCard scramble={round.scramble} onNewScramble={async () => {
            const updated = await rubiksRepo.refreshScramble(round.id);
            if (updated) setRound(updated);
          }} />

          <p
            className="text-[#98989D] font-[family-name:var(--font-suse)] text-center"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Waiting for both players to join...
          </p>

          {/* Player join cards */}
          <div className="flex gap-3">
            {members.map((member, i) => {
              const joined = round.joinedUserIds.includes(member.id);
              const isMe = member.id === currentUser.id;
              return (
                <div
                  key={member.id}
                  className="flex-1 flex flex-col items-center gap-2"
                  style={{
                    borderRadius: 0,
                    padding: 14,
                    borderWidth: 2,
                    borderStyle: joined ? "solid" : "dashed",
                    borderColor: joined ? getPlayerColor(i) : "rgba(150,150,150,0.3)",
                    background: joined ? getPlayerGradient(i) : "transparent",
                  }}
                >
                  <div
                    className="flex items-center justify-center font-bold"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: joined ? "rgba(255,255,255,0.3)" : "transparent",
                      borderWidth: joined ? 0 : 2,
                      borderStyle: "dashed",
                      borderColor: joined ? "transparent" : "rgba(150,150,150,0.3)",
                      color: joined ? "#fff" : "#98989D",
                      fontSize: 16,
                    }}
                  >
                    {joined && member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : joined ? (
                      member.name?.charAt(0)?.toUpperCase() || "?"
                    ) : member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                        style={{ opacity: 0.5 }}
                      />
                    ) : (
                      <span>{member.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <span
                    className="font-[family-name:var(--font-suse)]"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: joined ? "#fff" : "#98989D",
                    }}
                  >
                    {member.name}
                  </span>
                  {joined ? (
                    <IoCheckmarkCircle style={{ fontSize: 20, color: "#fff" }} />
                  ) : isMe ? (
                    <button
                      onClick={handleJoinRound}
                      disabled={actionLoading}
                      className="font-bold hover:underline disabled:opacity-50 font-[family-name:var(--font-suse)]"
                      style={{ fontSize: 13, color: getPlayerColor(i) }}
                    >
                      Tap to Join
                    </button>
                  ) : (
                    <span
                      className="text-[#98989D] font-[family-name:var(--font-suse)]"
                      style={{ fontSize: 13 }}
                    >
                      Waiting...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cancel round */}
          <button
            onClick={handleCancelRound}
            className="w-full flex items-center justify-center font-[family-name:var(--font-suse)]
              border border-[#98989D]/40 text-[#98989D] hover:border-[#636366] hover:text-[#636366]
              active:scale-[0.98] transition-all"
            style={{ borderRadius: 999, padding: 12, fontSize: 14, fontWeight: 700 }}
          >
            Cancel Round
          </button>
        </div>
      )}

      {/* ── ROUND: IN PROGRESS ──────────────────────── */}
      {round && round.status === "in_progress" && (
        <div className="w-full flex flex-col gap-4">
          {isTimed && <ScrambleCard scramble={round.scramble} onNewScramble={async () => {
            const updated = await rubiksRepo.refreshScramble(round.id);
            if (updated) setRound(updated);
          }} />}

          {isTimed ? (
            <>
              {/* Solve slots */}
              <div className="flex gap-3">
                {members.map((member, i) => {
                  const solve = solves.find((s) => s.userId === member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex-1 flex flex-col items-center gap-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]"
                      style={{
                        borderRadius: 0,
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
                        className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] uppercase"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        {member.name}
                      </span>
                      {solve ? (
                        <span
                          className="tabular-nums font-[family-name:var(--font-suse)]"
                          style={{ fontSize: 22, fontWeight: 800, color: getPlayerColor(i) }}
                        >
                          {solve.dnf ? "DNF" : formatMs(solve.timeMs)}
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

              {/* Timer display (inline, not fullscreen) */}
              {!timerRunning && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p
                    className="tabular-nums text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
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
                  className="flex items-center justify-center gap-2 text-white dark:text-[#0A0A0C] font-[family-name:var(--font-suse)]
                    bg-[#3A7BD5] dark:bg-white hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all self-center"
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
                  <p className="text-sm text-green-600 font-semibold font-[family-name:var(--font-suse)]">
                    Your time: {formatMs(mySolve.timeMs)}
                  </p>
                  <button
                    onClick={handleResetSolve}
                    className="flex items-center gap-1 text-xs text-[#98989D] hover:text-red-500 transition-colors font-[family-name:var(--font-suse)]"
                  >
                    <IoRefresh />
                    Reset my solve
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── Simple game: "Who Won?" big avatar circles ──── */
            <div className="flex flex-col items-center gap-6">
              <p
                className="text-[#98989D] font-[family-name:var(--font-suse)] text-center"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                Who won this round?
              </p>
              <div className="flex gap-8 justify-center">
                {members.map((member, i) => (
                  <button
                    key={member.id}
                    onClick={() => handleSimpleWin(member.id)}
                    disabled={actionLoading}
                    className="flex flex-col items-center gap-3
                      active:scale-[0.92] transition-all disabled:opacity-50"
                  >
                    <div
                      className="flex items-center justify-center text-white font-bold shadow-lg"
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: getPlayerColor(i),
                        fontSize: 28,
                      }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name?.charAt(0)?.toUpperCase() || "?"
                      )}
                    </div>
                    <span
                      className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
                      style={{ fontSize: 16, fontWeight: 700 }}
                    >
                      {member.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel round */}
          <button
            onClick={handleCancelRound}
            className="text-[#98989D] hover:text-[#636366] transition-colors font-[family-name:var(--font-suse)] underline self-center"
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
            className="flex items-center justify-center gap-2 text-white dark:text-[#0A0A0C] font-[family-name:var(--font-suse)]
              bg-[#3A7BD5] dark:bg-white hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all
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
    validSolves.length >= 1
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
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
          style={{ fontSize: 20, fontWeight: 800 }}
        >
          Round Complete!
        </h2>
      </div>

      {winnerMember && (
        <p
          className="font-[family-name:var(--font-suse)]"
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
                borderRadius: 0,
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
                className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {member.name}
              </span>
              <span
                className="tabular-nums font-[family-name:var(--font-suse)]"
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
