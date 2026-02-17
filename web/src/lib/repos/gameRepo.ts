/**
 * Supabase-backed Game repository.
 *
 * CRUD for user-created games within a couple.
 * Each game has a name, icon, type (simple/timed), and archive status.
 */
// @ts-nocheck — games table not yet in generated Supabase types
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Game, GameType } from "@/lib/models";
import type { GameRow } from "@/lib/db/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── helpers ─────────────────────────────────────────────────

function toDomainGame(r: GameRow): Game {
  return {
    id: r.id,
    coupleId: r.couple_id,
    name: r.name,
    icon: r.icon,
    type: r.game_type as GameType,
    isArchived: r.is_archived,
    createdAt: new Date(r.created_at).getTime(),
  };
}

// ── CRUD ────────────────────────────────────────────────────

/** Get all games for a couple, newest first. */
export async function getGames(coupleId: string): Promise<Game[]> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => toDomainGame(r as GameRow));
}

/** Create a new game for a couple. */
export async function createGame(
  coupleId: string,
  name: string,
  icon: string,
  gameType: GameType
): Promise<Game> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("games")
    .insert({
      couple_id: coupleId,
      name,
      icon,
      game_type: gameType,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create game");
  }
  return toDomainGame(data as GameRow);
}

/** Archive a game (soft-delete). */
export async function archiveGame(gameId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("games").update({ is_archived: true }).eq("id", gameId);
}

/** Unarchive a game. */
export async function unarchiveGame(gameId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("games").update({ is_archived: false }).eq("id", gameId);
}

/** Delete a game permanently. */
export async function deleteGame(gameId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw new Error(error.message);
}

/** Reset a game (delete all rounds matching game_key = gameId). */
export async function resetGame(
  coupleId: string,
  gameId: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from("rounds")
    .delete()
    .eq("couple_id", coupleId)
    .eq("game_key", gameId);
}

/** Get score for a specific game. Returns { [userId]: wins }. */
export async function getGameScores(
  coupleId: string,
  gameId: string
): Promise<Record<string, number>> {
  const supabase = createSupabaseBrowserClient();

  // Get closed rounds for this game
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("couple_id", coupleId)
    .eq("game_key", gameId)
    .eq("status", "closed");

  if (!rounds || rounds.length === 0) return {};

  const roundIds = rounds.map((r) => r.id);
  const { data: solves } = await supabase
    .from("solves")
    .select("*")
    .in("round_id", roundIds);

  if (!solves) return {};

  const scoreMap: Record<string, number> = {};
  // Group solves by round
  const solvesByRound: Record<string, typeof solves> = {};
  for (const s of solves) {
    if (!solvesByRound[s.round_id]) solvesByRound[s.round_id] = [];
    solvesByRound[s.round_id].push(s);
  }

  for (const roundId of roundIds) {
    const rSolves = (solvesByRound[roundId] ?? []).filter((s) => !s.dnf);
    if (rSolves.length >= 1) {
      const winner = rSolves.reduce((a, b) =>
        (a.time_ms ?? Infinity) < (b.time_ms ?? Infinity) ? a : b
      );
      scoreMap[winner.user_id] = (scoreMap[winner.user_id] || 0) + 1;
    }
  }

  return scoreMap;
}

// ── Realtime ────────────────────────────────────────────────

/** Subscribe to game changes for a couple. */
export function subscribeToGames(
  coupleId: string,
  cb: (games: Game[]) => void
): () => void {
  const supabase = createSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;

  const fetchAndNotify = async () => {
    const games = await getGames(coupleId);
    cb(games);
  };

  channel = supabase
    .channel(`games:${coupleId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        fetchAndNotify();
      }
    )
    .subscribe();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}
