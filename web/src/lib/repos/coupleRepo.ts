/**
 * Supabase-backed couple repository.
 *
 * Replaces the old AsyncStorage / localStorage repo.
 * Keeps the same conceptual API: create, join, get, exit, subscribe.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateInviteCode } from "@/lib/inviteCode";
import type { Couple, User } from "@/lib/models";
import type { CoupleRow, CoupleMemberRow } from "@/lib/db/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── helpers ─────────────────────────────────────────────────

/** Convert DB rows → domain Couple model */
function toDomainCouple(couple: CoupleRow, members: CoupleMemberRow[]): Couple {
  return {
    id: couple.id,
    inviteCode: couple.invite_code,
    status: couple.status as Couple["status"],
    members: members.map((m) => ({
      id: m.user_id,
      name: m.display_name ?? "",
      avatarUrl: m.avatar_url ?? undefined,
    })),
  };
}

// ── public API ──────────────────────────────────────────────

/**
 * Create a new couple room.
 * Inserts the couples row + a couple_members row for the creator.
 */
export async function createCouple(
  currentUserId: string,
  displayName: string,
  avatarUrl?: string
): Promise<Couple> {
  const supabase = createSupabaseBrowserClient();
  const inviteCode = generateInviteCode();

  // 1) Insert couple
  const { data: coupleRow, error: coupleErr } = await supabase
    .from("couples")
    .insert({ invite_code: inviteCode })
    .select()
    .single();

  if (coupleErr || !coupleRow) {
    throw new Error(coupleErr?.message ?? "Failed to create couple");
  }

  // 2) Insert the creator as first member
  const { error: memberErr } = await supabase.from("couple_members").insert({
    couple_id: coupleRow.id,
    user_id: currentUserId,
    display_name: displayName,
    avatar_url: avatarUrl ?? null,
  });

  if (memberErr) {
    // Clean up the orphaned couple
    await supabase.from("couples").delete().eq("id", coupleRow.id);
    throw new Error(memberErr.message);
  }

  return toDomainCouple(coupleRow as CoupleRow, [
    {
      id: crypto.randomUUID(),
      couple_id: coupleRow.id,
      user_id: currentUserId,
      display_name: displayName,
      avatar_url: avatarUrl ?? null,
      created_at: new Date().toISOString(),
    },
  ]);
}

/**
 * Join an existing couple by invite code.
 * Finds the couple, checks capacity, inserts a couple_members row,
 * and auto-updates status to 'ready' when full.
 */
export async function joinCouple(
  inviteCode: string,
  currentUserId: string,
  displayName: string,
  avatarUrl?: string
): Promise<Couple> {
  const supabase = createSupabaseBrowserClient();
  const code = inviteCode.trim().toUpperCase();

  // 1) Find the couple by invite code
  const { data: coupleRow, error: findErr } = await supabase
    .from("couples")
    .select("*")
    .eq("invite_code", code)
    .single();

  if (findErr || !coupleRow) {
    throw new Error("Invalid invite code");
  }

  // 2) Check capacity
  const { count, error: countErr } = await supabase
    .from("couple_members")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", coupleRow.id);

  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= (coupleRow as CoupleRow).max_members) {
    throw new Error("Room is already full");
  }

  // 3) Insert member
  const { error: memberErr } = await supabase.from("couple_members").insert({
    couple_id: coupleRow.id,
    user_id: currentUserId,
    display_name: displayName,
    avatar_url: avatarUrl ?? null,
  });

  if (memberErr) {
    if (memberErr.code === "23505") {
      // unique violation — user already in room
      throw new Error("You are already in this room");
    }
    throw new Error(memberErr.message);
  }

  // 4) If room is now full, mark couple as 'ready'
  const newCount = (count ?? 0) + 1;
  if (newCount >= (coupleRow as CoupleRow).max_members) {
    await supabase
      .from("couples")
      .update({ status: "ready" })
      .eq("id", coupleRow.id);
  }

  // 5) Fetch all members for return value
  const { data: allMembers } = await supabase
    .from("couple_members")
    .select("*")
    .eq("couple_id", coupleRow.id)
    .order("created_at", { ascending: true });

  // Re-fetch couple for updated status
  const { data: updatedCouple } = await supabase
    .from("couples")
    .select("*")
    .eq("id", coupleRow.id)
    .single();

  return toDomainCouple(
    (updatedCouple ?? coupleRow) as CoupleRow,
    (allMembers ?? []) as CoupleMemberRow[]
  );
}

/**
 * Get the couple + members for the current user.
 * Returns null if the user isn't in any couple.
 */
export async function getCoupleForUser(
  currentUserId: string
): Promise<Couple | null> {
  const supabase = createSupabaseBrowserClient();

  // Find the couple_members row for this user
  const { data: membership, error: memErr } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", currentUserId)
    .limit(1)
    .maybeSingle();

  if (memErr || !membership) return null;

  // Fetch the couple
  const { data: coupleRow, error: coupleErr } = await supabase
    .from("couples")
    .select("*")
    .eq("id", membership.couple_id)
    .single();

  if (coupleErr || !coupleRow) return null;

  // Fetch all members
  const { data: members } = await supabase
    .from("couple_members")
    .select("*")
    .eq("couple_id", coupleRow.id)
    .order("created_at", { ascending: true });

  return toDomainCouple(
    coupleRow as CoupleRow,
    (members ?? []) as CoupleMemberRow[]
  );
}

/**
 * Update a couple member's display name and/or avatar URL in Supabase.
 */
export async function updateMember(
  coupleId: string,
  userId: string,
  updates: { displayName?: string; avatarUrl?: string | null }
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const updateData: Record<string, unknown> = {};
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from("couple_members")
    .update(updateData)
    .eq("couple_id", coupleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Exit (leave) a couple room.
 * Deletes the user's couple_members row.
 * If no members remain, the couple row will cascade-delete via FK.
 */
export async function exitCouple(
  coupleId: string,
  currentUserId: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  await supabase
    .from("couple_members")
    .delete()
    .eq("couple_id", coupleId)
    .eq("user_id", currentUserId);

  // Check if couple is now empty → if so the cascade handles it.
  // If one member left, set status back to 'waiting'.
  const { count } = await supabase
    .from("couple_members")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", coupleId);

  if ((count ?? 0) > 0 && (count ?? 0) < 2) {
    await supabase
      .from("couples")
      .update({ status: "waiting" })
      .eq("id", coupleId);
  }

  if ((count ?? 0) === 0) {
    // No members left — delete the couple entirely
    await supabase.from("couples").delete().eq("id", coupleId);
  }
}

/**
 * Subscribe to realtime changes on couple_members for a specific couple.
 * Fires callback with the full updated Couple whenever members change.
 * Returns an unsubscribe function.
 */
export function subscribeToMembers(
  coupleId: string,
  cb: (couple: Couple) => void
): () => void {
  const supabase = createSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;

  const fetchAndNotify = async () => {
    const { data: coupleRow } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();

    const { data: members } = await supabase
      .from("couple_members")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true });

    if (coupleRow) {
      cb(
        toDomainCouple(
          coupleRow as CoupleRow,
          (members ?? []) as CoupleMemberRow[]
        )
      );
    }
  };

  channel = supabase
    .channel(`couple_members:${coupleId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "couple_members",
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        // Any INSERT/UPDATE/DELETE → re-fetch full state
        fetchAndNotify();
      }
    )
    .subscribe();

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}
