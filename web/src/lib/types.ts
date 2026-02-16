export type GameType = "simple" | "timed";

export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  initial: string;
  avatarUri?: string;
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  createdAt: number;
  isArchived: boolean;
  type: GameType;
}

export interface WinEvent {
  id: string;
  gameId: string;
  winnerPlayerId: string;
  timestamp: number;
  note?: string;
  source: "tap" | "timer";
  elapsedMs?: number;
  elapsedDisplay?: string;
}

/** A single Rubik's Cube round with scramble + both player times */
export interface RoundEvent {
  id: string;
  gameId: string;
  timestamp: number;
  scramble: string;
  playerATimeMs: number;
  playerBTimeMs: number;
  winnerPlayerId: string;
  note?: string;
  metadata?: {
    inspectionSeconds?: number;
    dnfA?: boolean;
    dnfB?: boolean;
  };
}

/** Persisted in-progress round state (survives app restarts) */
export interface RoundInProgress {
  gameId: string;
  scramble: string;
  playerATimeMs: number | null;
  playerBTimeMs: number | null;
  dnfA?: boolean;
  dnfB?: boolean;
}

export interface TimedStats {
  bestTime: number | null;
  averageTime: number | null;
  last5Average: number | null;
  solveCount: number;
}

export interface RoundStats {
  bestTime: number | null;
  averageTime: number | null;
  last5Average: number | null;
  roundCount: number;
}

export interface AppData {
  players: [Player, Player];
  games: Game[];
  events: WinEvent[];
  roundEvents: RoundEvent[];
  roundInProgress: RoundInProgress | null;
  activeGameId: string | null;
}
