export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  initial: string;
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  createdAt: number;
  isArchived: boolean;
}

export interface WinEvent {
  id: string;
  gameId: string;
  winnerPlayerId: string;
  timestamp: number;
  note?: string;
  source: "tap";
}

export interface AppData {
  players: [Player, Player];
  games: Game[];
  events: WinEvent[];
  activeGameId: string | null;
}
