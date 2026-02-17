"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "@/lib/auth-context";
import CloudLoader from "@/components/CloudLoader";
import * as rubiksRepo from "@/lib/repos/rubiksRepo";
import type { Round, Solve, User } from "@/lib/models";
import {
  IoTime,
  IoTrashOutline,
  IoEllipsisVertical,
  IoTimeOutline,
} from "react-icons/io5";
import { SwipeRow } from "@/components/SwipeRow";

// ── helpers ─────────────────────────────────────────────────

function formatMs(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${rem}`;
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const GRADIENT_A = "linear-gradient(160deg, #F5D5C8, #F0B89E, #E8956E, #E07850, #D4628A)";
const GRADIENT_B = "linear-gradient(160deg, #A8C8F0, #88BDE8, #6CB4EE, #7DD4D4, #90DBC8)";

function getPlayerColor(index: number): string {
  return index === 0 ? "#D4628A" : "#3A7BD5";
}

function getPlayerGradient(index: number): string {
  return index === 0 ? GRADIENT_A : GRADIENT_B;
}

// Crown SVG
function CrownIcon() {
  return (
    <svg width={28} height={22} viewBox="0 0 24 20" fill="none">
      <path
        d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z"
        fill="rgba(255,255,255,0.85)"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Profile Card ────────────────────────────────────────────

function PlayerProfileCard({
  name,
  wins,
  gradient,
  avatarUrl,
  initial,
  isLeading,
  playerColor,
  onClick,
}: {
  name: string;
  wins: number;
  gradient: string;
  avatarUrl?: string;
  initial: string;
  isLeading: boolean;
  playerColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 relative overflow-hidden grain-overlay text-left cursor-pointer active:scale-[0.98] transition-transform"
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
                backgroundColor: playerColor,
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
            {wins}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Event Row ───────────────────────────────────────────────

function EventRow({
  winnerName,
  winnerColor,
  winnerAvatarUrl,
  winnerInitial,
  timeText,
  elapsedDisplay,
}: {
  winnerName: string;
  winnerColor: string;
  winnerAvatarUrl?: string;
  winnerInitial: string;
  timeText: string;
  elapsedDisplay?: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 bg-[#ECE7DE] dark:bg-[#1A1A1C]"
      style={{ borderRadius: 18, padding: 14 }}
    >
      {/* Winner dot */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 2.5,
          borderStyle: "solid",
          borderColor: winnerColor,
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: winnerColor,
          }}
        >
          {winnerAvatarUrl ? (
            <img
              src={winnerAvatarUrl}
              alt={winnerName}
              className="object-cover"
              style={{ width: 22, height: 22, borderRadius: 11 }}
            />
          ) : (
            <span
              className="text-white font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {winnerInitial}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#98989D]"><IoTime style={{ fontSize: 14 }} /></span>
            <span
              className="text-[#98989D] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 12, fontWeight: 400 }}
            >
              Rubik&apos;s Cube
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-[#98989D] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 11, fontWeight: 400 }}
            >
              {timeText}
            </span>
          </div>
        </div>
        <span
          className="font-[family-name:var(--font-nunito)]"
          style={{ fontSize: 15, fontWeight: 700, color: winnerColor }}
        >
          {winnerName} won{elapsedDisplay ? ` — ${elapsedDisplay}` : ""}
        </span>
      </div>
    </div>
  );
}

// ── Stats helpers ───────────────────────────────────────────

interface PlayerStats {
  totalWins: number;
  bestTime: number | null;
  avgTime: number | null;
  roundCount: number;
  winRate: number;
}

function computePlayerStats(
  userId: string,
  allRounds: Round[],
  allSolves: Solve[],
  members: User[]
): PlayerStats {
  const closedRounds = allRounds.filter((r) => r.status === "closed");
  const playerSolves = allSolves.filter(
    (s) => s.userId === userId && !s.dnf && s.timeMs > 0
  );
  const times = playerSolves.map((s) => s.timeMs);

  let wins = 0;
  for (const cr of closedRounds) {
    const rSolves = allSolves.filter((s) => s.roundId === cr.id && !s.dnf);
    if (rSolves.length >= 1) {
      const winner = rSolves.reduce((a, b) => (a.timeMs < b.timeMs ? a : b));
      if (winner.userId === userId) wins++;
    }
  }

  const totalEvents = closedRounds.length;

  return {
    totalWins: wins,
    bestTime: times.length > 0 ? Math.min(...times) : null,
    avgTime:
      times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : null,
    roundCount: playerSolves.length,
    winRate: totalEvents > 0 ? Math.round((wins / totalEvents) * 100) : 0,
  };
}

function getStreak(
  allRounds: Round[],
  allSolves: Solve[]
): { playerId: string | null; count: number } {
  const closedRounds = [...allRounds]
    .filter((r) => r.status === "closed")
    .sort((a, b) => (b.closedAt ?? b.startedAt) - (a.closedAt ?? a.startedAt));

  let streakPlayer: string | null = null;
  let count = 0;

  for (const cr of closedRounds) {
    const rSolves = allSolves.filter((s) => s.roundId === cr.id && !s.dnf);
    if (rSolves.length < 1) continue;
    const winner = rSolves.reduce((a, b) => (a.timeMs < b.timeMs ? a : b));
    if (!streakPlayer) {
      streakPlayer = winner.userId;
      count = 1;
    } else if (winner.userId === streakPlayer) {
      count++;
    } else {
      break;
    }
  }

  return { playerId: streakPlayer, count };
}

// ── Main component ──────────────────────────────────────────

export default function HistoryPage() {
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [allSolves, setAllSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [statSheetPlayer, setStatSheetPlayer] = useState<number | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  useEffect(() => {
    if (!couple?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [rounds, solves] = await Promise.all([
          rubiksRepo.getAllRounds(couple.id),
          rubiksRepo.getAllSolves(couple.id),
        ]);
        setAllRounds(rounds);
        setAllSolves(solves);
      } catch (e) {
        console.error("Failed to load history:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [couple?.id]);

  // Polling removed — realtime subscriptions handle updates

  const members = couple?.members ?? [];

  const playerStatsMap = useMemo(() => {
    const map: Record<string, PlayerStats> = {};
    for (const m of members) {
      map[m.id] = computePlayerStats(m.id, allRounds, allSolves, members);
    }
    return map;
  }, [members, allRounds, allSolves]);

  const streak = useMemo(
    () => getStreak(allRounds, allSolves),
    [allRounds, allSolves]
  );

  // Build timeline from closed rounds
  const timeline = useMemo(() => {
    const closedRounds = allRounds
      .filter((r) => r.status === "closed")
      .sort((a, b) => (b.closedAt ?? b.startedAt) - (a.closedAt ?? a.startedAt));

    return closedRounds
      .map((round) => {
        const roundSolves = allSolves.filter((s) => s.roundId === round.id);
        const validSolves = roundSolves.filter((s) => !s.dnf);
        const winner =
          validSolves.length >= 1
            ? validSolves.reduce((a, b) => (a.timeMs < b.timeMs ? a : b))
            : null;
        return { round, roundSolves, winner };
      })
      .filter(({ winner }) => winner !== null); // Hide rounds with no valid solves
  }, [allRounds, allSolves]);

  // Timed stats for stat sheet
  const timedStatsA = useMemo(() => playerStatsMap[members[0]?.id], [playerStatsMap, members]);
  const timedStatsB = useMemo(() => playerStatsMap[members[1]?.id], [playerStatsMap, members]);

  if (!couple || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
          Join or create a room first
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CloudLoader />
      </div>
    );
  }

  const overallA = timedStatsA?.totalWins ?? 0;
  const overallB = timedStatsB?.totalWins ?? 0;

  return (
    <div className="flex flex-col max-w-lg mx-auto pb-4">
      {/* ── Header ──────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <h1
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
          style={{ fontSize: 28, fontWeight: 800 }}
        >
          History
        </h1>
      </div>

      {/* ── Profile cards ───────────────────────────── */}
      <div className="flex gap-2.5 px-4 mb-3">
        <PlayerProfileCard
          name={members[0]?.name || "Player 1"}
          wins={overallA}
          gradient={GRADIENT_A}
          avatarUrl={members[0]?.avatarUrl}
          initial={members[0]?.name?.charAt(0)?.toUpperCase() || "1"}
          isLeading={overallA > overallB}
          playerColor="#D4628A"
          onClick={() => setStatSheetPlayer(0)}
        />
        <PlayerProfileCard
          name={members[1]?.name || "Player 2"}
          wins={overallB}
          gradient={GRADIENT_B}
          avatarUrl={members[1]?.avatarUrl}
          initial={members[1]?.name?.charAt(0)?.toUpperCase() || "2"}
          isLeading={overallB > overallA}
          playerColor="#3A7BD5"
          onClick={() => setStatSheetPlayer(1)}
        />
      </div>

      {/* ── Timed Stats Card ────────────────────────── */}
      {(timedStatsA?.roundCount ?? 0) > 0 || (timedStatsB?.roundCount ?? 0) > 0 ? (
        <div
          className="mx-4 mb-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] flex flex-col"
          style={{ borderRadius: 18, padding: 16 }}
        >
          {/* Player header row */}
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <span
                className="font-[family-name:var(--font-nunito)] uppercase tracking-wide"
                style={{ fontSize: 13, fontWeight: 800, color: getPlayerColor(0) }}
              >
                {members[0]?.name || "Player 1"}
              </span>
            </div>
            <div className="flex-1 text-right">
              <span
                className="font-[family-name:var(--font-nunito)] uppercase tracking-wide"
                style={{ fontSize: 13, fontWeight: 800, color: getPlayerColor(1) }}
              >
                {members[1]?.name || "Player 2"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#D6D1C8] dark:bg-[#2A2A2C] mb-4" />

          {/* BEST TIME */}
          <div className="flex items-center mb-1">
            <span className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] uppercase tracking-wide" style={{ fontSize: 11, fontWeight: 800 }}>
              Best Time
            </span>
          </div>
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(0) }}>
                {timedStatsA?.bestTime ? formatMs(timedStatsA.bestTime) : "—"}
              </span>
            </div>
            <div className="flex-1 text-right">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(1) }}>
                {timedStatsB?.bestTime ? formatMs(timedStatsB.bestTime) : "—"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#D6D1C8] dark:bg-[#2A2A2C] mb-4" />

          {/* AVG TIME */}
          <div className="flex items-center mb-1">
            <span className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] uppercase tracking-wide" style={{ fontSize: 11, fontWeight: 800 }}>
              Avg Time
            </span>
          </div>
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(0) }}>
                {timedStatsA?.avgTime ? formatMs(timedStatsA.avgTime) : "—"}
              </span>
            </div>
            <div className="flex-1 text-right">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(1) }}>
                {timedStatsB?.avgTime ? formatMs(timedStatsB.avgTime) : "—"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#D6D1C8] dark:bg-[#2A2A2C] mb-4" />

          {/* WIN RATE */}
          <div className="flex items-center mb-1">
            <span className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] uppercase tracking-wide" style={{ fontSize: 11, fontWeight: 800 }}>
              Win Rate
            </span>
          </div>
          <div className="flex items-center">
            <div className="flex-1">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(0) }}>
                {timedStatsA?.winRate ?? 0}%
              </span>
            </div>
            <div className="flex-1 text-right">
              <span className="font-[family-name:var(--font-nunito)] tabular-nums" style={{ fontSize: 22, fontWeight: 300, color: getPlayerColor(1) }}>
                {timedStatsB?.winRate ?? 0}%
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Result count ────────────────────────────── */}
      {timeline.length > 0 && (
        <p
          className="text-[#98989D] font-[family-name:var(--font-nunito)] px-4 mb-2"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          {timeline.length} result{timeline.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Timeline ────────────────────────────────── */}
      {timeline.length === 0 ? (
        <div className="flex flex-col items-center pt-16 gap-3">
          <IoTimeOutline className="text-[#98989D]" style={{ fontSize: 64 }} />
          <p
            className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 20, fontWeight: 700 }}
          >
            No wins recorded yet
          </p>
          <p
            className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center px-10"
            style={{ fontSize: 14, fontWeight: 400 }}
          >
            Go to the Log tab and start tapping to record wins
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4">
          {timeline.map(({ round, roundSolves, winner }) => {
            const winnerMember = winner
              ? members.find((m) => m.id === winner.userId)
              : null;
            const winnerIdx = winnerMember
              ? members.indexOf(winnerMember)
              : -1;
            const ts = round.closedAt ?? round.startedAt;

            return (
              <SwipeRow
                key={round.id}
                id={round.id}
                isOpen={openSwipeId === round.id}
                setOpenId={setOpenSwipeId}
                onDelete={async (id) => {
                  try {
                    await rubiksRepo.deleteRound(id);
                    setAllRounds((prev) => prev.filter((r) => r.id !== id));
                    setAllSolves((prev) =>
                      prev.filter((s) => s.roundId !== id)
                    );
                    setOpenSwipeId(null);
                  } catch (e) {
                    console.error("Failed to delete round:", e);
                  }
                }}
              >
                <EventRow
                  winnerName={winnerMember?.name ?? "Unknown"}
                  winnerColor={getPlayerColor(winnerIdx >= 0 ? winnerIdx : 0)}
                  winnerAvatarUrl={winnerMember?.avatarUrl}
                  winnerInitial={winnerMember?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  timeText={formatTime(ts)}
                  elapsedDisplay={winner ? formatMs(winner.timeMs) : undefined}
                />
              </SwipeRow>
            );
          })}
        </div>
      )}

      {/* ── Player Stat Sheet Modal ─────────────────── */}
      {statSheetPlayer !== null && (() => {
        const player = members[statSheetPlayer];
        const stats = playerStatsMap[player?.id];
        const playerScore = stats?.totalWins ?? 0;
        const opponentScore =
          statSheetPlayer === 0 ? overallB : overallA;
        const isOnStreak = streak.playerId === player?.id;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 modal-backdrop"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setStatSheetPlayer(null)}
          >
            <div
              className="relative w-full overflow-hidden modal-content"
              style={{
                maxWidth: 380,
                borderRadius: 28,
                backgroundColor: "#0A0A0C",
                minHeight: 420,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background avatar image with motion blur */}
              {player?.avatarUrl && (
                <div
                  className="absolute top-0 right-0 bottom-0 overflow-hidden"
                  style={{
                    width: "75%",
                    borderTopRightRadius: 28,
                    borderBottomRightRadius: 28,
                  }}
                >
                  {/* Motion trail */}
                  <img
                    src={player.avatarUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.15, transform: "translateX(-8px)", filter: "blur(12px)" }}
                  />
                  <img
                    src={player.avatarUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.25, transform: "translateX(-3px)", filter: "blur(4px)" }}
                  />
                  {/* Main image */}
                  <img
                    src={player.avatarUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Left fade */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to right, #0A0A0C 0%, rgba(10,10,12,0.92) 15%, rgba(10,10,12,0.55) 35%, rgba(10,10,12,0.15) 55%, transparent 75%)",
                    }}
                  />
                  {/* Bottom fade */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(10,10,12,0.6) 0%, transparent 35%)",
                    }}
                  />
                  {/* Top fade */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to bottom, rgba(10,10,12,0.5) 0%, transparent 20%)",
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10" style={{ padding: 28, paddingTop: 32, paddingRight: 16 }}>
                {/* Header */}
                <div className="flex items-center mb-1">
                  {playerScore > opponentScore && (
                    <svg width={24} height={18} viewBox="0 0 24 20" fill="none" className="mr-2">
                      <path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="#FFD93D" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span
                    className="text-white font-[family-name:var(--font-nunito)] truncate flex-1"
                    style={{ fontSize: 28, fontWeight: 800 }}
                  >
                    {player?.name}
                  </span>
                </div>

                <span
                  className="font-[family-name:var(--font-nunito)] block"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 28,
                  }}
                >
                  Rubik&apos;s Cube
                </span>

                {/* Stats */}
                <div className="flex flex-col gap-1.5 mb-1">
                  <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                    <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                      {playerScore}
                    </span>
                    <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                      WINS
                    </span>
                  </div>
                  <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                    <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                      {stats?.winRate ?? 0}%
                    </span>
                    <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                      WIN RATE
                    </span>
                  </div>
                  <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                    <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                      {isOnStreak ? streak.count : 0}
                    </span>
                    <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                      STREAK
                    </span>
                  </div>
                </div>

                {/* Round stats */}
                {(stats?.roundCount ?? 0) > 0 && (
                  <>
                    <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 8, marginBottom: 8 }} />
                    <span
                      className="block font-[family-name:var(--font-nunito)]"
                      style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 8, marginTop: 4 }}
                    >
                      ROUND STATS
                    </span>
                    <div className="flex flex-col gap-1.5 mb-1">
                      <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                        <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                          {stats?.bestTime ? formatMs(stats.bestTime) : "—"}
                        </span>
                        <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                          BEST
                        </span>
                      </div>
                      <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                        <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                          {stats?.avgTime ? formatMs(stats.avgTime) : "—"}
                        </span>
                        <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                          AVERAGE
                        </span>
                      </div>
                      <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                        <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 34, fontWeight: 800, lineHeight: "38px" }}>
                          {stats?.roundCount ?? 0}
                        </span>
                        <span className="block font-[family-name:var(--font-nunito)]" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: -2 }}>
                          ROUNDS
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <p
                  className="text-center font-[family-name:var(--font-nunito)]"
                  style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.25)", marginTop: 20 }}
                >
                  Tap outside to close
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
