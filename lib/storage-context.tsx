import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { AppData, Player, Game, GameType, WinEvent, TimedStats, RoundEvent, RoundInProgress, RoundStats } from "./types";

const STORAGE_KEY = "@rivalry_data";

const defaultPlayers: [Player, Player] = [
  { id: "player_a", name: "Player 1", avatarColor: "#FF6B6B", initial: "1" },
  { id: "player_b", name: "Player 2", avatarColor: "#2EC4B6", initial: "2" },
];

const defaultData: AppData = {
  players: defaultPlayers,
  games: [],
  events: [],
  roundEvents: [],
  roundInProgress: null,
  activeGameId: null,
};

interface StorageContextValue {
  data: AppData;
  isLoading: boolean;
  setActiveGame: (gameId: string) => void;
  addGame: (name: string, icon: string, type?: GameType) => Game;
  archiveGame: (gameId: string) => void;
  unarchiveGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  resetGame: (gameId: string) => void;
  logWin: (playerId: string, note?: string) => WinEvent | null;
  logTimedWin: (playerId: string, elapsedMs: number, note?: string) => WinEvent | null;
  undoLastWin: () => boolean;
  updatePlayer: (playerId: string, name: string) => void;
  updatePlayerAvatar: (playerId: string, avatarUri: string) => void;
  addNote: (eventId: string, note: string) => void;
  getScoreForGame: (gameId: string) => { a: number; b: number };
  getOverallScore: () => { a: number; b: number };
  getStreak: () => { playerId: string | null; count: number };
  getTimedStatsForPlayer: (gameId: string, playerId: string) => TimedStats;
  isPersonalBest: (gameId: string, playerId: string, elapsedMs: number) => boolean;
  // Round methods
  saveRound: (round: Omit<RoundEvent, "id" | "timestamp">) => RoundEvent;
  deleteRound: (roundId: string) => void;
  deleteEvent: (eventId: string) => void;
  undoLastRound: (gameId: string) => boolean;
  getRoundsForGame: (gameId: string) => RoundEvent[];
  getRoundStatsForPlayer: (gameId: string, playerId: string) => RoundStats;
  getHeadToHead: (gameId: string) => { a: number; b: number };
  saveRoundInProgress: (rip: RoundInProgress | null) => void;
  addRoundNote: (roundId: string, note: string) => void;
  lastEvent: WinEvent | null;
  lastRoundEvent: RoundEvent | null;
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
        // Migration: add missing fields for older data
        if (!parsed.roundEvents) parsed.roundEvents = [];
        if (parsed.roundInProgress === undefined) parsed.roundInProgress = null;
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

  const addGame = useCallback((name: string, icon: string, type: GameType = "simple"): Game => {
    const game: Game = {
      id: Crypto.randomUUID(),
      name,
      icon,
      createdAt: Date.now(),
      isArchived: false,
      type,
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
      const newRounds = (prev.roundEvents || []).filter(r => r.gameId !== gameId);
      const newActiveId = prev.activeGameId === gameId
        ? newGames.find(g => !g.isArchived)?.id || null
        : prev.activeGameId;
      const newRip = prev.roundInProgress?.gameId === gameId ? null : prev.roundInProgress;
      const newData = { ...prev, games: newGames, events: newEvents, roundEvents: newRounds, roundInProgress: newRip, activeGameId: newActiveId };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const resetGame = useCallback((gameId: string) => {
    setData(prev => {
      const newEvents = prev.events.filter(e => e.gameId !== gameId);
      const newRounds = (prev.roundEvents || []).filter(r => r.gameId !== gameId);
      const newRip = prev.roundInProgress?.gameId === gameId ? null : prev.roundInProgress;
      const newData = { ...prev, events: newEvents, roundEvents: newRounds, roundInProgress: newRip };
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

  const formatElapsed = (ms: number): string => {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  };

  const logTimedWin = useCallback((playerId: string, elapsedMs: number, note?: string): WinEvent | null => {
    if (!data.activeGameId) return null;
    const event: WinEvent = {
      id: Crypto.randomUUID(),
      gameId: data.activeGameId,
      winnerPlayerId: playerId,
      timestamp: Date.now(),
      note,
      source: "timer",
      elapsedMs,
      elapsedDisplay: formatElapsed(elapsedMs),
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

  const updatePlayerAvatar = useCallback((playerId: string, avatarUri: string) => {
    setData(prev => {
      const newPlayers = prev.players.map(p =>
        p.id === playerId ? { ...p, avatarUri } : p
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
    const gameRounds = (data.roundEvents || []).filter(r => r.gameId === gameId);
    return {
      a: gameEvents.filter(e => e.winnerPlayerId === "player_a").length + gameRounds.filter(r => r.winnerPlayerId === "player_a").length,
      b: gameEvents.filter(e => e.winnerPlayerId === "player_b").length + gameRounds.filter(r => r.winnerPlayerId === "player_b").length,
    };
  }, [data.events, data.roundEvents]);

  const getOverallScore = useCallback(() => {
    const roundEvents = data.roundEvents || [];
    return {
      a: data.events.filter(e => e.winnerPlayerId === "player_a").length + roundEvents.filter(r => r.winnerPlayerId === "player_a").length,
      b: data.events.filter(e => e.winnerPlayerId === "player_b").length + roundEvents.filter(r => r.winnerPlayerId === "player_b").length,
    };
  }, [data.events, data.roundEvents]);

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

  const getTimedStatsForPlayer = useCallback((gameId: string, playerId: string): TimedStats => {
    const events = data.events.filter(e => e.gameId === gameId && e.winnerPlayerId === playerId && e.elapsedMs != null);
    if (events.length === 0) return { bestTime: null, averageTime: null, last5Average: null, solveCount: 0 };
    const times = events.map(e => e.elapsedMs!).sort((a, b) => a - b);
    const bestTime = times[0];
    const averageTime = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    const last5 = events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map(e => e.elapsedMs!);
    const last5Average = Math.round(last5.reduce((s, t) => s + t, 0) / last5.length);
    return { bestTime, averageTime, last5Average, solveCount: events.length };
  }, [data.events]);

  const isPersonalBest = useCallback((gameId: string, playerId: string, elapsedMs: number): boolean => {
    const events = data.events.filter(e => e.gameId === gameId && e.winnerPlayerId === playerId && e.elapsedMs != null);
    if (events.length === 0) return true;
    const bestTime = Math.min(...events.map(e => e.elapsedMs!));
    return elapsedMs <= bestTime;
  }, [data.events]);

  // ---- Round methods ----

  const saveRound = useCallback((roundInput: Omit<RoundEvent, "id" | "timestamp">): RoundEvent => {
    const round: RoundEvent = {
      ...roundInput,
      id: Crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setLastEventTime(Date.now());
    setData(prev => {
      const newData = {
        ...prev,
        roundEvents: [...(prev.roundEvents || []), round],
        roundInProgress: null,
      };
      persist(newData);
      return newData;
    });
    return round;
  }, [persist]);

  const deleteRound = useCallback((roundId: string) => {
    setData(prev => {
      const newRounds = (prev.roundEvents || []).filter(r => r.id !== roundId);
      const newData = { ...prev, roundEvents: newRounds };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const deleteEvent = useCallback((eventId: string) => {
    setData(prev => {
      const newEvents = prev.events.filter(e => e.id !== eventId);
      const newData = { ...prev, events: newEvents };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const undoLastRound = useCallback((gameId: string): boolean => {
    const rounds = (data.roundEvents || []).filter(r => r.gameId === gameId);
    if (rounds.length === 0) return false;
    const lastRound = rounds[rounds.length - 1];
    setData(prev => {
      const newRounds = (prev.roundEvents || []).filter(r => r.id !== lastRound.id);
      const newData = { ...prev, roundEvents: newRounds };
      persist(newData);
      return newData;
    });
    setLastEventTime(null);
    return true;
  }, [data.roundEvents, persist]);

  const getRoundsForGame = useCallback((gameId: string): RoundEvent[] => {
    return (data.roundEvents || []).filter(r => r.gameId === gameId).sort((a, b) => b.timestamp - a.timestamp);
  }, [data.roundEvents]);

  const getRoundStatsForPlayer = useCallback((gameId: string, playerId: string): RoundStats => {
    const rounds = (data.roundEvents || []).filter(r => r.gameId === gameId);
    const isA = playerId === "player_a";
    const times = rounds
      .filter(r => {
        const dnf = isA ? r.metadata?.dnfA : r.metadata?.dnfB;
        return !dnf;
      })
      .map(r => isA ? r.playerATimeMs : r.playerBTimeMs)
      .filter(t => t > 0);
    if (times.length === 0) return { bestTime: null, averageTime: null, last5Average: null, roundCount: rounds.length };
    const sorted = [...times].sort((a, b) => a - b);
    const bestTime = sorted[0];
    const averageTime = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    // last 5 by recency
    const recentRounds = rounds
      .filter(r => {
        const dnf = isA ? r.metadata?.dnfA : r.metadata?.dnfB;
        return !dnf;
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    const last5Times = recentRounds.map(r => isA ? r.playerATimeMs : r.playerBTimeMs);
    const last5Average = last5Times.length > 0
      ? Math.round(last5Times.reduce((s, t) => s + t, 0) / last5Times.length)
      : null;
    return { bestTime, averageTime, last5Average, roundCount: rounds.length };
  }, [data.roundEvents]);

  const getHeadToHead = useCallback((gameId: string): { a: number; b: number } => {
    const rounds = (data.roundEvents || []).filter(r => r.gameId === gameId);
    return {
      a: rounds.filter(r => r.winnerPlayerId === "player_a").length,
      b: rounds.filter(r => r.winnerPlayerId === "player_b").length,
    };
  }, [data.roundEvents]);

  const saveRoundInProgress = useCallback((rip: RoundInProgress | null) => {
    setData(prev => {
      const newData = { ...prev, roundInProgress: rip };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const addRoundNote = useCallback((roundId: string, note: string) => {
    setData(prev => {
      const newRounds = (prev.roundEvents || []).map(r =>
        r.id === roundId ? { ...r, note } : r
      );
      const newData = { ...prev, roundEvents: newRounds };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const lastEvent = data.events.length > 0 ? data.events[data.events.length - 1] : null;
  const lastRoundEvent = (data.roundEvents || []).length > 0
    ? (data.roundEvents || [])[(data.roundEvents || []).length - 1]
    : null;

  const value = useMemo(() => ({
    data,
    isLoading,
    setActiveGame,
    addGame,
    archiveGame,
    unarchiveGame,
    deleteGame,
    resetGame,
    logWin,
    logTimedWin,
    undoLastWin,
    updatePlayer,
    updatePlayerAvatar,
    addNote,
    getScoreForGame,
    getOverallScore,
    getStreak,
    getTimedStatsForPlayer,
    isPersonalBest,
    saveRound,
    deleteRound,
    deleteEvent,
    undoLastRound,
    getRoundsForGame,
    getRoundStatsForPlayer,
    getHeadToHead,
    saveRoundInProgress,
    addRoundNote,
    lastEvent,
    lastRoundEvent,
    lastEventTime,
  }), [data, isLoading, setActiveGame, addGame, archiveGame, unarchiveGame, deleteGame, resetGame, logWin, logTimedWin, undoLastWin, updatePlayer, updatePlayerAvatar, addNote, getScoreForGame, getOverallScore, getStreak, getTimedStatsForPlayer, isPersonalBest, saveRound, deleteRound, deleteEvent, undoLastRound, getRoundsForGame, getRoundStatsForPlayer, getHeadToHead, saveRoundInProgress, addRoundNote, lastEvent, lastRoundEvent, lastEventTime]);

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
