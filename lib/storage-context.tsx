import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { AppData, Player, Game, WinEvent } from "./types";

const STORAGE_KEY = "@rivalry_data";

const defaultPlayers: [Player, Player] = [
  { id: "player_a", name: "Player 1", avatarColor: "#FF6B6B", initial: "1" },
  { id: "player_b", name: "Player 2", avatarColor: "#2EC4B6", initial: "2" },
];

const defaultData: AppData = {
  players: defaultPlayers,
  games: [],
  events: [],
  activeGameId: null,
};

interface StorageContextValue {
  data: AppData;
  isLoading: boolean;
  setActiveGame: (gameId: string) => void;
  addGame: (name: string, icon: string) => Game;
  archiveGame: (gameId: string) => void;
  unarchiveGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  logWin: (playerId: string, note?: string) => WinEvent | null;
  undoLastWin: () => boolean;
  updatePlayer: (playerId: string, name: string) => void;
  addNote: (eventId: string, note: string) => void;
  getScoreForGame: (gameId: string) => { a: number; b: number };
  getOverallScore: () => { a: number; b: number };
  getStreak: () => { playerId: string | null; count: number };
  lastEvent: WinEvent | null;
  lastEventTime: number | null;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        setData(parsed);
      }
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(async (newData: AppData) => {
    setData(newData);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error("Failed to persist data:", e);
    }
  }, []);

  const setActiveGame = useCallback((gameId: string) => {
    setData(prev => {
      const newData = { ...prev, activeGameId: gameId };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const addGame = useCallback((name: string, icon: string): Game => {
    const game: Game = {
      id: Crypto.randomUUID(),
      name,
      icon,
      createdAt: Date.now(),
      isArchived: false,
    };
    setData(prev => {
      const newData = {
        ...prev,
        games: [...prev.games, game],
        activeGameId: prev.activeGameId || game.id,
      };
      persist(newData);
      return newData;
    });
    return game;
  }, [persist]);

  const archiveGame = useCallback((gameId: string) => {
    setData(prev => {
      const newGames = prev.games.map(g =>
        g.id === gameId ? { ...g, isArchived: true } : g
      );
      const newActiveId = prev.activeGameId === gameId
        ? newGames.find(g => !g.isArchived)?.id || null
        : prev.activeGameId;
      const newData = { ...prev, games: newGames, activeGameId: newActiveId };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const unarchiveGame = useCallback((gameId: string) => {
    setData(prev => {
      const newGames = prev.games.map(g =>
        g.id === gameId ? { ...g, isArchived: false } : g
      );
      const newData = { ...prev, games: newGames };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const deleteGame = useCallback((gameId: string) => {
    setData(prev => {
      const newGames = prev.games.filter(g => g.id !== gameId);
      const newEvents = prev.events.filter(e => e.gameId !== gameId);
      const newActiveId = prev.activeGameId === gameId
        ? newGames.find(g => !g.isArchived)?.id || null
        : prev.activeGameId;
      const newData = { ...prev, games: newGames, events: newEvents, activeGameId: newActiveId };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const logWin = useCallback((playerId: string, note?: string): WinEvent | null => {
    if (!data.activeGameId) return null;
    const event: WinEvent = {
      id: Crypto.randomUUID(),
      gameId: data.activeGameId,
      winnerPlayerId: playerId,
      timestamp: Date.now(),
      note,
      source: "tap",
    };
    setLastEventTime(Date.now());
    setData(prev => {
      const newData = { ...prev, events: [...prev.events, event] };
      persist(newData);
      return newData;
    });
    return event;
  }, [data.activeGameId, persist]);

  const undoLastWin = useCallback((): boolean => {
    if (data.events.length === 0) return false;
    setData(prev => {
      const newData = { ...prev, events: prev.events.slice(0, -1) };
      persist(newData);
      return newData;
    });
    setLastEventTime(null);
    return true;
  }, [data.events.length, persist]);

  const updatePlayer = useCallback((playerId: string, name: string) => {
    setData(prev => {
      const newPlayers = prev.players.map(p =>
        p.id === playerId ? { ...p, name, initial: name.charAt(0).toUpperCase() } : p
      ) as [Player, Player];
      const newData = { ...prev, players: newPlayers };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const addNote = useCallback((eventId: string, note: string) => {
    setData(prev => {
      const newEvents = prev.events.map(e =>
        e.id === eventId ? { ...e, note } : e
      );
      const newData = { ...prev, events: newEvents };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const getScoreForGame = useCallback((gameId: string) => {
    const gameEvents = data.events.filter(e => e.gameId === gameId);
    return {
      a: gameEvents.filter(e => e.winnerPlayerId === "player_a").length,
      b: gameEvents.filter(e => e.winnerPlayerId === "player_b").length,
    };
  }, [data.events]);

  const getOverallScore = useCallback(() => {
    return {
      a: data.events.filter(e => e.winnerPlayerId === "player_a").length,
      b: data.events.filter(e => e.winnerPlayerId === "player_b").length,
    };
  }, [data.events]);

  const getStreak = useCallback(() => {
    if (data.events.length === 0) return { playerId: null, count: 0 };
    const sorted = [...data.events].sort((a, b) => b.timestamp - a.timestamp);
    const lastPlayer = sorted[0].winnerPlayerId;
    let count = 0;
    for (const ev of sorted) {
      if (ev.winnerPlayerId === lastPlayer) count++;
      else break;
    }
    return { playerId: lastPlayer, count };
  }, [data.events]);

  const lastEvent = data.events.length > 0 ? data.events[data.events.length - 1] : null;

  const value = useMemo(() => ({
    data,
    isLoading,
    setActiveGame,
    addGame,
    archiveGame,
    unarchiveGame,
    deleteGame,
    logWin,
    undoLastWin,
    updatePlayer,
    addNote,
    getScoreForGame,
    getOverallScore,
    getStreak,
    lastEvent,
    lastEventTime,
  }), [data, isLoading, setActiveGame, addGame, archiveGame, unarchiveGame, deleteGame, logWin, undoLastWin, updatePlayer, addNote, getScoreForGame, getOverallScore, getStreak, lastEvent, lastEventTime]);

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
}
