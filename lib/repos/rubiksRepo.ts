import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Round, Solve } from "../models";
import { EventEmitter } from "../event-emitter";

const ROUNDS_KEY = "@rivalry_rounds";
const SOLVES_KEY = "@rivalry_solves";

const roundEmitters = new Map<string, EventEmitter<Round | null>>();
const solvesEmitters = new Map<string, EventEmitter<Solve[]>>();

function getRoundEmitter(roundId: string): EventEmitter<Round | null> {
  if (!roundEmitters.has(roundId)) {
    roundEmitters.set(roundId, new EventEmitter<Round | null>());
  }
  return roundEmitters.get(roundId)!;
}

function getSolvesEmitter(roundId: string): EventEmitter<Solve[]> {
  if (!solvesEmitters.has(roundId)) {
    solvesEmitters.set(roundId, new EventEmitter<Solve[]>());
  }
  return solvesEmitters.get(roundId)!;
}

// ---- Rounds ----

async function loadRounds(): Promise<Round[]> {
  try {
    const raw = await AsyncStorage.getItem(ROUNDS_KEY);
    return raw ? (JSON.parse(raw) as Round[]) : [];
  } catch {
    return [];
  }
}

async function persistRounds(rounds: Round[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  } catch (e) {
    console.error("Failed to persist rounds:", e);
  }
}

export async function getActiveRound(coupleId: string): Promise<Round | null> {
  const rounds = await loadRounds();
  // Prefer in_progress, then fall back to open
  const inProgress = rounds.find((r) => r.coupleId === coupleId && r.status === "in_progress");
  if (inProgress) return inProgress;
  return rounds.find((r) => r.coupleId === coupleId && r.status === "open") ?? null;
}

export async function createRound(coupleId: string, userId: string, gameId: string, scramble: string): Promise<Round> {
  const round: Round = {
    id: Crypto.randomUUID(),
    coupleId,
    gameId,
    scramble,
    status: "open",
    joinedUserIds: [userId],
    createdByUserId: userId,
    startedAt: Date.now(),
  };
  const rounds = await loadRounds();
  rounds.push(round);
  await persistRounds(rounds);
  getRoundEmitter(round.id).emit(round);
  return round;
}

export async function joinRound(roundId: string, userId: string): Promise<Round | null> {
  const rounds = await loadRounds();
  const idx = rounds.findIndex((r) => r.id === roundId);
  if (idx === -1) return null;
  const round = rounds[idx];
  if (round.joinedUserIds.includes(userId)) return round; // already joined
  const updatedJoined = [...round.joinedUserIds, userId];
  // Auto-transition to in_progress when 2 players are joined
  const newStatus = updatedJoined.length >= 2 ? "in_progress" : round.status;
  rounds[idx] = { ...round, joinedUserIds: updatedJoined, status: newStatus as Round["status"] };
  await persistRounds(rounds);
  getRoundEmitter(roundId).emit(rounds[idx]);
  return rounds[idx];
}

export async function closeRound(roundId: string): Promise<void> {
  const rounds = await loadRounds();
  const idx = rounds.findIndex((r) => r.id === roundId);
  if (idx !== -1) {
    rounds[idx] = { ...rounds[idx], status: "closed", closedAt: Date.now() };
    await persistRounds(rounds);
    getRoundEmitter(roundId).emit(rounds[idx]);
  }
}

export async function getRound(roundId: string): Promise<Round | null> {
  const rounds = await loadRounds();
  return rounds.find((r) => r.id === roundId) ?? null;
}

export async function getAllRounds(coupleId: string): Promise<Round[]> {
  const rounds = await loadRounds();
  return rounds
    .filter((r) => r.coupleId === coupleId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

// ---- Solves ----

async function loadSolves(): Promise<Solve[]> {
  try {
    const raw = await AsyncStorage.getItem(SOLVES_KEY);
    return raw ? (JSON.parse(raw) as Solve[]) : [];
  } catch {
    return [];
  }
}

async function persistSolves(solves: Solve[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
  } catch (e) {
    console.error("Failed to persist solves:", e);
  }
}

export async function submitSolve(
  roundId: string,
  userId: string,
  timeMs: number,
  dnf?: boolean
): Promise<Solve> {
  const solve: Solve = {
    id: Crypto.randomUUID(),
    roundId,
    userId,
    timeMs,
    dnf,
    createdAt: Date.now(),
  };
  const solves = await loadSolves();
  // Remove any previous solve from this user for this round (overwrite)
  const filtered = solves.filter((s) => !(s.roundId === roundId && s.userId === userId));
  filtered.push(solve);
  await persistSolves(filtered);
  getSolvesEmitter(roundId).emit(filtered.filter((s) => s.roundId === roundId));
  return solve;
}

export async function resetSolve(roundId: string, userId: string): Promise<void> {
  const solves = await loadSolves();
  const filtered = solves.filter((s) => !(s.roundId === roundId && s.userId === userId));
  await persistSolves(filtered);
  getSolvesEmitter(roundId).emit(filtered.filter((s) => s.roundId === roundId));
}

export async function getSolves(roundId: string): Promise<Solve[]> {
  const solves = await loadSolves();
  return solves.filter((s) => s.roundId === roundId);
}

export async function getAllSolves(coupleId: string): Promise<Solve[]> {
  const rounds = await loadRounds();
  const coupleRoundIds = new Set(rounds.filter((r) => r.coupleId === coupleId).map((r) => r.id));
  const solves = await loadSolves();
  return solves.filter((s) => coupleRoundIds.has(s.roundId));
}

// ---- Subscriptions ----

export function subscribeToRound(roundId: string, cb: (round: Round | null) => void): () => void {
  return getRoundEmitter(roundId).subscribe(cb);
}

export function subscribeToSolves(roundId: string, cb: (solves: Solve[]) => void): () => void {
  return getSolvesEmitter(roundId).subscribe(cb);
}
