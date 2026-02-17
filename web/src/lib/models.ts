/** Core domain models for the 2-player lobby + shared round architecture */

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Couple {
  id: string;
  inviteCode: string;
  status: "waiting" | "ready";
  members: User[];
}

export interface Round {
  id: string;
  coupleId: string;
  gameId: string;
  scramble: string;
  status: "open" | "in_progress" | "closed";
  /** User IDs of players who have joined / marked ready */
  joinedUserIds: string[];
  createdByUserId: string;
  startedAt: number;
  closedAt?: number;
}

export interface Solve {
  id: string;
  roundId: string;
  userId: string;
  timeMs: number;
  dnf?: boolean;
  createdAt: number;
}

export type GameType = "simple" | "timed";

export interface Game {
  id: string;
  coupleId: string;
  name: string;
  icon: string;
  type: GameType;
  isArchived: boolean;
  createdAt: number;
}

export interface Session {
  currentUser: User | null;
  couple: Couple | null;
}

// ---- Helpers ----

/** Returns 1 or 2 for the player's position in the couple, or null if not found */
export function getPlayerRole(couple: Couple, userId: string): 1 | 2 | null {
  const idx = couple.members.findIndex((m) => m.id === userId);
  if (idx === 0) return 1;
  if (idx === 1) return 2;
  return null;
}

/** Returns the other member of the couple */
export function getPartnerUser(couple: Couple, currentUserId: string): User | null {
  return couple.members.find((m) => m.id !== currentUserId) ?? null;
}
