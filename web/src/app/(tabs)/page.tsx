"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  IoShareSocial,
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

const GRADIENT_A = "radial-gradient(248.46% 209.77% at 0% -122.17%, #FAD6BE 56.97%, #FB834F 100%)";
const GRADIENT_B = "radial-gradient(153.92% 152.12% at 92.94% 12.61%, #F0869A 0%, #FBE1D2 100%)";

function getPlayerColor(index: number): string {
  return index === 0 ? "#E07850" : "#F1899C";
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
        className="text-center text-[#292929] font-[family-name:var(--font-suse)] mb-4"
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
                ? "bg-[#292929] text-white"
                : "bg-[#FEFEFE] text-[#292929]"
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
  scoreColor,
}: {
  name: string;
  score: number;
  color: string;
  gradient: string;
  avatarUrl?: string;
  initial: string;
  isLeading: boolean;
  scoreColor?: string;
}) {
  return (
    <div
      className="flex-1 relative overflow-hidden score-card-hover"
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
            className="font-[family-name:var(--font-suse)]"
            style={{ fontSize: 48, fontWeight: 700, lineHeight: "52px", color: scoreColor || "#fff" }}
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
      className="w-full bg-[#FEFEFE]"
      style={{ borderRadius: 18, padding: 14 }}
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
          className="text-[#292929] font-[family-name:var(--font-suse)] flex-1"
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

  // Mode picker modal
  const [showModeModal, setShowModeModal] = useState(false);

  // Poke partner (async waiting state)
  const [pokeSent, setPokeSent] = useState(false);

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
        // Async: if both players have submitted, reveal + close the round
        if (
          updatedRound.mode === "async" &&
          updatedRound.submittedUserIds.length >= 2 &&
          updatedRound.revealStatus === "hidden"
        ) {
          rubiksRepo.revealAndCloseRound(updatedRound.id).then(async () => {
            const allSolves = await rubiksRepo.getSolves(updatedRound.id);
            handleRoundComplete(updatedRound.id, allSolves);
          }).catch(() => {/* ignore — other device may have revealed already */});
        }
      } else {
        setSolves([]);
      }
    });
    return () => unsub();
  }, [couple?.id, handleRoundComplete]);

  // ── Realtime: subscribe to solves ─────────────────────────
  useEffect(() => {
    if (!round?.id) return;
    const unsub = rubiksRepo.subscribeToSolves(round.id, (updatedSolves) => {
      setSolves(updatedSolves);
      // Live rounds: auto-complete when both solves are visible
      if (round.status === "in_progress" && round.mode !== "async" && updatedSolves.length >= 2) {
        handleRoundComplete(round.id, updatedSolves);
      }
    });
    return () => unsub();
  }, [round?.id, round?.status, round?.mode, handleRoundComplete]);

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
        // Optimistically add my solve to local state so the Start Timer button hides immediately
        setSolves((prev) => {
          if (prev.find((s) => s.userId === currentUser.id)) return prev;
          return [...prev, { id: "pending", roundId: round.id, userId: currentUser.id, timeMs: finalTime, createdAt: Date.now() } as Solve];
        });
        // Async mode: track submission and reveal if both have submitted
        if (round.mode === "async") {
          const updatedRound = await rubiksRepo.trackSolveSubmitted(round.id, currentUser.id);
          if (updatedRound && updatedRound.submittedUserIds.length >= 2) {
            await rubiksRepo.revealAndCloseRound(round.id);
            const allSolves = await rubiksRepo.getSolves(round.id);
            handleRoundComplete(round.id, allSolves);
          } else if (updatedRound) {
            setRound(updatedRound);
            // First to submit — notify partner to take their turn
            if (couple?.id) {
              const playerName = currentUser.name || "Your partner";
              fetch("/api/push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  coupleId: couple.id,
                  senderUserId: currentUser.id,
                  message: `${playerName} submitted their cube time - your turn pls`,
                  url: `/rubiks/round/${round.id}`,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error("Failed to submit solve:", e);
      }
    }
  }, [round?.id, round?.mode, currentUser?.id, couple?.id, currentUser?.name, handleRoundComplete]);

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
  const handleCreateRound = async (mode: "live" | "async" = "live") => {
    if (!couple?.id || !currentUser?.id) return;
    setActionLoading(true);
    try {
      const newRound = await rubiksRepo.createRound(couple.id, currentUser.id, gameKey, mode);
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

  const handlePoke = useCallback(async () => {
    if (!couple?.id || !currentUser?.id || pokeSent) return;
    setPokeSent(true);
    const playerName = currentUser.name || "Your partner";
    fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupleId: couple.id,
        senderUserId: currentUser.id,
        message: `${playerName} says its your turn`,
        url: round?.id ? `/rubiks/round/${round.id}` : "/",
      }),
    }).catch(() => {});
    // Reset after 30s so they can poke again if needed
    setTimeout(() => setPokeSent(false), 30000);
  }, [couple?.id, currentUser?.id, currentUser?.name, round?.id, pokeSent]);

  // Reset poke state when round changes
  useEffect(() => { setPokeSent(false); }, [round?.id]);

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
        <p className="text-sm text-[#636366] font-[family-name:var(--font-suse)]">
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
          className="text-center text-[#292929] font-[family-name:var(--font-suse)] mb-4"
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
                  ? "linear-gradient(135deg, #E8E6E3, #DDDBD8)"
                  : "linear-gradient(135deg, #DDDBD8, #E8E6E3)",
                borderRadius: 22,
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
          className="w-full bg-[#FEFEFE] mb-4 animate-pulse"
          style={{ borderRadius: 16, padding: 14 }}
        >
          <div
            style={{
              width: 120,
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(0,0,0,0.08)",
            }}
          />
        </div>

        {/* Skeleton round area */}
        <div
          className="w-full bg-[#FEFEFE] animate-pulse"
          style={{ borderRadius: 22, padding: 24, height: 120 }}
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
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </div>
      )}

      {/* ── Header title — game name (hidden during round) ── */}
      {!round && (
        <h1
          className="text-center text-[#292929] font-[family-name:var(--font-suse)] mb-4"
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
            className="w-full bg-[#FEFEFE]"
            style={{ borderRadius: 16, padding: 14, marginBottom: 44 }}
          >
            <p
              className="font-[family-name:var(--font-suse-mono)] text-center"
              style={{ fontSize: 16, fontWeight: 600, color: "#000" }}
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
        <div className="w-full flex flex-col items-center">
          <button
            onClick={() => isTimed ? setShowModeModal(true) : handleCreateRound("live")}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 font-[family-name:var(--font-suse-mono)]
              bg-[#292929] hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderRadius: 999,
              paddingTop: 20,
              paddingBottom: 20,
              fontSize: 24,
              fontWeight: 600,
              color: "#FEFEFE",
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
            className="text-[#292929] font-[family-name:var(--font-suse)]"
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
                    borderRadius: 16,
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
          {isTimed && <ScrambleCard scramble={round.scramble} onNewScramble={round.mode === "live" ? async () => {
            const updated = await rubiksRepo.refreshScramble(round.id);
            if (updated) setRound(updated);
          } : undefined} />}

          {/* Async: share link card (visible until both submitted) */}
          {round.mode === "async" && round.submittedUserIds.length < 2 && (
            <AsyncShareCard roundId={round.id} />
          )}

          {/* Async: current user hasn't joined yet — show accept button */}
          {round.mode === "async" && !round.joinedUserIds.includes(currentUser.id) && (
            <button
              onClick={handleJoinRound}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 text-white font-[family-name:var(--font-suse)]
                bg-[#292929] hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
                disabled:opacity-50"
              style={{ borderRadius: 999, paddingTop: 20, paddingBottom: 20, fontSize: 20, fontWeight: 700 }}
            >
              {actionLoading ? "Joining..." : "🏋 Accept Challenge"}
            </button>
          )}

          {isTimed ? (
            <>
              {/* Solve slots */}
              <div className="flex gap-3">
                {members.map((member, i) => {
                  const solve = solves.find((s) => s.userId === member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex-1 flex flex-col items-center gap-2 bg-[#FEFEFE]"
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
                        className="text-[#292929] font-[family-name:var(--font-suse)] uppercase"
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
                      ) : round.mode === "async" && round.submittedUserIds.includes(member.id) ? (
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

              {/* Timer display — hide once submitted or after round */}
              {!timerRunning && !mySolve && !round.submittedUserIds.includes(currentUser.id) && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p
                    className="tabular-nums text-[#292929] font-[family-name:var(--font-suse)]"
                    style={{ fontSize: 64, fontWeight: 800 }}
                  >
                    {formatMsDisplay(timerElapsed)}
                  </p>
                </div>
              )}

              {/* Timer controls — show if user has joined and hasn't submitted */}
              {!mySolve && !round.submittedUserIds.includes(currentUser.id) && !timerRunning && (round.mode === "live" || round.joinedUserIds.includes(currentUser.id)) && (
                <button
                  onClick={startTimer}
                  className="flex items-center justify-center gap-2 text-white font-[family-name:var(--font-suse)]
                    bg-[#292929] hover:bg-[#1A1A1A] active:scale-[0.98] transition-all self-center"
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
                    {round.mode === "async" && round.submittedUserIds.length < 2 && (
                      <span className="text-[#98989D] ml-2">— waiting for partner…</span>
                    )}
                  </p>
                  {round.mode === "async" && round.submittedUserIds.length < 2 && (
                    <button
                      onClick={handlePoke}
                      disabled={pokeSent}
                      className="flex items-center gap-1.5 font-[family-name:var(--font-suse)] transition-all active:scale-[0.97] disabled:opacity-50"
                      style={{
                        background: pokeSent ? "#E8E8E8" : "#F4F3F1",
                        border: "1.5px solid #E0E0E0",
                        borderRadius: 999,
                        padding: "8px 20px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#292929",
                      }}
                    >
                      {pokeSent ? "✓ Poke sent!" : "👉 Poke"}
                    </button>
                  )}
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
                      className="text-[#292929] font-[family-name:var(--font-suse)]"
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
            onClick={() => isTimed ? setShowModeModal(true) : handleCreateRound("live")}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 text-white font-[family-name:var(--font-suse)]
              bg-[#292929] hover:bg-[#1A1A1A] active:scale-[0.98] transition-all
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

      {/* ── Mode Picker Modal ────────────────────────── */}
      {showModeModal && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center px-4 pt-4 pb-24"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModeModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#F4F3F1] flex flex-col gap-3 p-4 pb-8"
            style={{ borderRadius: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-center text-[#292929] font-[family-name:var(--font-suse)]"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}
            >
              Choose Round Mode
            </p>

            {/* Live */}
            <button
              onClick={async () => { setShowModeModal(false); await handleCreateRound("live"); }}
              disabled={actionLoading}
              className="flex flex-col items-start gap-1 bg-[#FEFEFE] active:scale-[0.98] transition-all
                disabled:opacity-50 text-left"
              style={{ borderRadius: 18, padding: "16px 18px" }}
            >
              <span
                className="text-[#292929] font-[family-name:var(--font-suse)]"
                style={{ fontSize: 16, fontWeight: 700 }}
              >
                🤝 Play Together
              </span>
              <span
                className="text-[#98989D] font-[family-name:var(--font-suse)]"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                Both players solve at the same time
              </span>
            </button>

            {/* Async */}
            <button
              onClick={async () => { setShowModeModal(false); await handleCreateRound("async"); }}
              disabled={actionLoading}
              className="flex flex-col items-start gap-1 bg-[#292929] active:scale-[0.98] transition-all
                disabled:opacity-50 text-left"
              style={{ borderRadius: 18, padding: "16px 18px" }}
            >
              <span
                className="text-white font-[family-name:var(--font-suse)]"
                style={{ fontSize: 16, fontWeight: 700 }}
              >
                ⚡ Async Challenge
              </span>
              <span
                className="text-white/60 font-[family-name:var(--font-suse)]"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                Solve separately — times reveal after both submit
              </span>
            </button>
          </div>
        </div>,
        document.body
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
          className="text-[#292929] font-[family-name:var(--font-suse)]"
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
              className="flex-1 flex flex-col items-center gap-2 bg-[#FEFEFE]"
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
                className="text-[#292929] font-[family-name:var(--font-suse)]"
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

// ── Async Share Card ────────────────────────────────────────

function AsyncShareCard({ roundId }: { roundId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/rubiks/round/${roundId}`
      : `/rubiks/round/${roundId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Async Cube Challenge", url });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="w-full bg-[#FEFEFE] flex flex-col gap-3"
      style={{ borderRadius: 18, padding: 14 }}
    >
      <p
        className="text-[#98989D] font-[family-name:var(--font-suse)] uppercase"
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
      >
        ⚡ Async Challenge
      </p>
      <p
        className="text-[#292929] font-[family-name:var(--font-suse)]"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        Send this link to your partner. Their time is hidden until you both submit.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-[#F4F3F1] active:scale-[0.97] transition-all font-[family-name:var(--font-suse)]"
          style={{ borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#292929" }}
        >
          <IoCopy style={{ fontSize: 14 }} />
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 bg-[#292929] text-white active:scale-[0.97] transition-all font-[family-name:var(--font-suse)]"
          style={{ borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
        >
          <IoShareSocial style={{ fontSize: 14 }} />
          Share
        </button>
      </div>
    </div>
  );
}
