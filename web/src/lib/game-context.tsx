"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Game } from "@/lib/models";
import * as gameRepo from "@/lib/repos/gameRepo";
import { useSession } from "@/lib/auth-context";

const ACTIVE_GAME_KEY = "cheese_squeeze_active_game_id";

interface GameContextValue {
  /** All games for the current couple */
  games: Game[];
  /** Currently selected game (null = none selected) */
  activeGame: Game | null;
  /** Set the active game by ID */
  setActiveGameId: (gameId: string | null) => void;
  /** Refresh games from Supabase */
  refreshGames: () => Promise<void>;
  /** Whether games are still loading */
  gamesLoading: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const coupleId = session.couple?.id;

  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameIdState] = useState<string | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  // Load persisted active game ID
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_GAME_KEY);
      if (stored) setActiveGameIdState(stored);
    } catch {}
  }, []);

  // Load games when couple changes
  useEffect(() => {
    if (!coupleId) {
      setGames([]);
      setGamesLoading(false);
      return;
    }

    setGamesLoading(true);
    gameRepo
      .getGames(coupleId)
      .then((g) => {
        setGames(g);
        // If no active game set, or active game not in list, select the first one
        setActiveGameIdState((prev) => {
          const valid = g.find((game) => game.id === prev && !game.isArchived);
          if (valid) return prev;
          const first = g.find((game) => !game.isArchived);
          const newId = first?.id ?? null;
          if (newId) localStorage.setItem(ACTIVE_GAME_KEY, newId);
          return newId;
        });
      })
      .catch(() => {})
      .finally(() => setGamesLoading(false));

    // Subscribe to realtime updates
    const unsub = gameRepo.subscribeToGames(coupleId, (updatedGames) => {
      setGames(updatedGames);
    });

    return () => unsub();
  }, [coupleId]);

  const setActiveGameId = useCallback((gameId: string | null) => {
    setActiveGameIdState(gameId);
    if (gameId) {
      localStorage.setItem(ACTIVE_GAME_KEY, gameId);
    } else {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  }, []);

  const refreshGames = useCallback(async () => {
    if (!coupleId) return;
    const g = await gameRepo.getGames(coupleId);
    setGames(g);
  }, [coupleId]);

  const activeGame = useMemo(
    () => games.find((g) => g.id === activeGameId) ?? null,
    [games, activeGameId]
  );

  const value = useMemo(
    () => ({
      games,
      activeGame,
      setActiveGameId,
      refreshGames,
      gamesLoading,
    }),
    [games, activeGame, setActiveGameId, refreshGames, gamesLoading]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGames() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGames must be used within a GameProvider");
  return ctx;
}
