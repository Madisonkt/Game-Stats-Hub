/**
 * Supabase-backed Rubik's round + solve repository.
 *
 * Replaces the old AsyncStorage / localStorage repo.
 * Same conceptual API: create/join/close rounds, submit/reset solves, subscribe.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateScramble } from "@/lib/scramble";
import type { Round, Solve } from "@/lib/models";
import type { RoundRow, SolveRow } from "@/lib/db/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── helpers ─────────────────────────────────────────────────

function toDomainRound(r: RoundRow): Round {
  return {
    id: r.id,
    coupleId: r.couple_id,
    gameId: r.game_key,
    scramble: r.scramble,
    status: r.status,
    mode: (r.mode as "live" | "async") ?? "live",
    revealStatus: (r.reveal_status as "hidden" | "revealed") ?? "hidden",
    submittedUserIds: r.submitted_user_ids ?? [],
    joinedUserIds: r.joined_user_ids ?? [],
    createdByUserId: r.created_by ?? "",
    startedAt: new Date(r.started_at).getTime(),
    closedAt: r.closed_at ? new Date(r.closed_at).getTime() : undefined,
  };
}

function toDomainSolve(s: SolveRow): Solve {
  return {
    id: s.id,
    roundId: s.round_id,
    userId: s.user_id,
    timeMs: s.time_ms ?? 0,
    dnf: s.dnf,
    createdAt: new Date(s.created_at).getTime(),
  };
}

// ── Rounds ──────────────────────────────────────────────────

/**
 * Get the latest open or in_progress round for a couple.
 * Prefers in_progress, falls back to open.
 */
export async function getActiveRound(
  coupleId: string,
  gameKey: string = "rubiks"
): Promise<Round | null> {
  const supabase = createSupabaseBrowserClient();

  // Try in_progress first
  const { data: inProgress } = await supabase
    .from("rounds")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("game_key", gameKey)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inProgress) return toDomainRound(inProgress as RoundRow);

  // Then open
  const { data: open } = await supabase
    .from("rounds")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("game_key", gameKey)
    .eq("status", "open")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return toDomainRound(open as RoundRow);

  return null;
}

/**
 * Create a new round. The creator is auto-joined.
 * Uses crypto.randomUUID() as origin_id for dedupe safety.
 * mode='async': round is immediately in_progress (no partner join needed to start timing).
 */
export async function createRound(
  coupleId: string,
  userId: string,
  gameKey: string = "rubiks",
  mode: "live" | "async" = "live"
): Promise<Round> {
  const supabase = createSupabaseBrowserClient();
  const originId = crypto.randomUUID();
  const scramble = generateScramble();

  const { data, error } = await supabase
    .from("rounds")
    .insert({
      couple_id: coupleId,
      game_key: gameKey,
      origin_id: originId,
      scramble,
      // Async rounds jump straight to in_progress so creator can time immediately
      status: mode === "async" ? "in_progress" : "open",
      mode,
      reveal_status: "hidden",
      submitted_user_ids: [],
      created_by: userId,
      joined_user_ids: [userId],
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create round");
  }

  return toDomainRound(data as RoundRow);
}

/**
 * Join an existing round. Updates joined_user_ids to include userId
 * (no duplicates). Auto-transitions live rounds to in_progress when 2 players joined.
 * Async rounds stay in_progress (they were created that way).
 */
export async function joinRound(
  roundId: string,
  userId: string
): Promise<Round | null> {
  const supabase = createSupabaseBrowserClient();

  // Fetch current round
  const { data: current, error: fetchErr } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (fetchErr || !current) return null;

  const row = current as RoundRow;
  if (row.joined_user_ids.includes(userId)) {
    return toDomainRound(row); // already joined
  }

  const updatedJoined = [...row.joined_user_ids, userId];
  // For live rounds: move to in_progress once 2 players have joined.
  // For async rounds: already in_progress, keep status.
  const newStatus =
    row.mode !== "async" && updatedJoined.length >= 2
      ? "in_progress"
      : row.status;

  const { data: updated, error: updateErr } = await supabase
    .from("rounds")
    .update({
      joined_user_ids: updatedJoined,
      status: newStatus,
    })
    .eq("id", roundId)
    .select()
    .single();

  if (updateErr || !updated) return null;
  return toDomainRound(updated as RoundRow);
}

/**
 * Regenerate the scramble for a round.
 */
export async function refreshScramble(roundId: string): Promise<Round | null> {
  const supabase = createSupabaseBrowserClient();
  const newScramble = generateScramble();
  const { data, error } = await supabase
    .from("rounds")
    .update({ scramble: newScramble })
    .eq("id", roundId)
    .select()
    .single();
  if (error || !data) return null;
  return toDomainRound(data as RoundRow);
}

/**
 * Close a round (set status to 'closed', stamp closed_at).
 */
export async function closeRound(roundId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  await supabase
    .from("rounds")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", roundId);
}

/**
 * Delete a round and its associated solves (cascade).
 * Used by History "delete event" and Log "undo" actions.
 */
export async function deleteRound(roundId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  // Solves cascade-delete via FK, so just delete the round
  const { error } = await supabase
    .from("rounds")
    .delete()
    .eq("id", roundId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Re-open a closed round (undo).
 * Sets status back to 'closed' → deletes the round entirely.
 * For simplicity, undo = delete the round so scores revert.
 */
export async function undoRound(roundId: string): Promise<void> {
  return deleteRound(roundId);
}

/**
 * Get a single round by ID.
 */
export async function getRound(roundId: string): Promise<Round | null> {
  const supabase = createSupabaseBrowserClient();

  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  return data ? toDomainRound(data as RoundRow) : null;
}

/**
 * Reveal both solves and close an async round.
 * Called when both submitted_user_ids are present.
 */
export async function revealAndCloseRound(roundId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from("rounds")
    .update({
      reveal_status: "revealed",
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", roundId);
}

/**
 * Atomically track that a user has submitted their async solve.
 *
 * Uses the `append_submitted_user_id` Postgres RPC (array_append in a single
 * UPDATE statement) to prevent the race condition where two near-simultaneous
 * submits can overwrite each other via a read-modify-write cycle.
 *
 * SQL prerequisite (run supabase-atomic-submit.sql in Supabase SQL Editor):
 *   create function public.append_submitted_user_id(p_round_id uuid, p_user_id uuid)
 *   returns setof public.rounds as $$ update rounds set submitted_user_ids =
 *   array_append(submitted_user_ids, p_user_id) where id = p_round_id
 *   and not (p_user_id = any(submitted_user_ids)) returning *; $$ language sql security definer;
 *
 * Falls back to a direct fetch if the RPC returns no rows (already tracked).
 */
export async function trackSolveSubmitted(
  roundId: string,
  userId: string
): Promise<Round | null> {
  const supabase = createSupabaseBrowserClient();

  // Atomic array_append — only appends if userId not already present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcRows, error: rpcError } = await (supabase as any)
    .rpc("append_submitted_user_id", { p_round_id: roundId, p_user_id: userId });

  if (!rpcError && rpcRows && (rpcRows as RoundRow[]).length > 0) {
    return toDomainRound((rpcRows as RoundRow[])[0]);
  }

  // No-op (already tracked) or RPC not yet deployed — fetch current state
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  return data ? toDomainRound(data as RoundRow) : null;
}

/**
 * Get all rounds for a couple, newest first.
 */
export async function getAllRounds(
  coupleId: string,
  gameKey?: string
): Promise<Round[]> {
  const supabase = createSupabaseBrowserClient();

  let query = supabase
    .from("rounds")
    .select("*")
    .eq("couple_id", coupleId)
    .order("started_at", { ascending: false });

  if (gameKey) {
    query = query.eq("game_key", gameKey);
  }

  const { data } = await query;
  return (data ?? []).map((r) => toDomainRound(r as RoundRow));
}

// ── Solves ──────────────────────────────────────────────────

/**
 * Submit (upsert) a solve for a round.
 * Uses ON CONFLICT (round_id, user_id) to overwrite previous solve.
 */
export async function submitSolve(
  roundId: string,
  userId: string,
  timeMs: number,
  dnf?: boolean
): Promise<Solve> {
  const supabase = createSupabaseBrowserClient();
  const originId = crypto.randomUUID();

  const { data, error } = await supabase
    .from("solves")
    .upsert(
      {
        round_id: roundId,
        user_id: userId,
        origin_id: originId,
        time_ms: timeMs,
        dnf: dnf ?? false,
      },
      { onConflict: "round_id,user_id" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit solve");
  }

  return toDomainSolve(data as SolveRow);
}

/**
 * Delete a solve (reset). For "undo" / "reset my solve" action.
 */
export async function resetSolve(
  roundId: string,
  userId: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  await supabase
    .from("solves")
    .delete()
    .eq("round_id", roundId)
    .eq("user_id", userId);
}

/**
 * Get all solves for a round.
 */
export async function getSolves(roundId: string): Promise<Solve[]> {
  const supabase = createSupabaseBrowserClient();

  const { data } = await supabase
    .from("solves")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((s) => toDomainSolve(s as SolveRow));
}

/**
 * Get all solves across all rounds for a couple (for history/stats).
 */
export async function getAllSolves(
  coupleId: string,
  gameKey?: string
): Promise<Solve[]> {
  const supabase = createSupabaseBrowserClient();

  // Get round IDs for the couple (optionally filtered by game)
  let roundQuery = supabase
    .from("rounds")
    .select("id")
    .eq("couple_id", coupleId);

  if (gameKey) {
    roundQuery = roundQuery.eq("game_key", gameKey);
  }

  const { data: rounds } = await roundQuery;

  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r) => r.id);

  const { data: solves } = await supabase
    .from("solves")
    .select("*")
    .in("round_id", roundIds)
    .order("created_at", { ascending: true });

  return (solves ?? []).map((s) => toDomainSolve(s as SolveRow));
}

// ── Realtime subscriptions ──────────────────────────────────

/**
 * Subscribe to round changes for a couple (new rounds, status changes, joins).
 * Callback receives the latest active round (or null if none).
 */
export function subscribeToRounds(
  coupleId: string,
  cb: (round: Round | null) => void
): () => void {
  const supabase = createSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;

  const fetchAndNotify = async () => {
    const round = await getActiveRound(coupleId);
    cb(round);
  };

  channel = supabase
    .channel(`rounds:${coupleId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rounds",
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

/**
 * Subscribe to solve changes for a specific round.
 * Callback receives the full list of solves for that round.
 * Note: for async rounds with reveal_status='hidden', RLS will only return
 * the current user's own solve until the round is revealed.
 */
export function subscribeToSolves(
  roundId: string,
  cb: (solves: Solve[]) => void
): () => void {
  const supabase = createSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;

  const fetchAndNotify = async () => {
    const solves = await getSolves(roundId);
    cb(solves);
  };

  channel = supabase
    .channel(`solves:${roundId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "solves",
        filter: `round_id=eq.${roundId}`,
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

/**
 * Subscribe to changes for a single specific round by ID.
 * Useful for the deep-link async challenge page.
 */
export function subscribeToRound(
  roundId: string,
  cb: (round: Round | null) => void
): () => void {
  const supabase = createSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;

  const fetchAndNotify = async () => {
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .maybeSingle();
    cb(data ? toDomainRound(data as RoundRow) : null);
  };

  channel = supabase
    .channel(`round:${roundId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rounds",
        filter: `id=eq.${roundId}`,
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
