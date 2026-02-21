/**
 * Supabase-backed Couple Plant repository.
 *
 * Tables: couple_plant (one row per couple), plant_actions (event log)
 * Realtime subscription on couple_plant for live sync.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ── Constants ────────────────────────────────────────────────

export const DECAY_RATE_PER_HOUR = 0.5; // points lost per hour of inactivity
export const WATER_BOOST = 8;
export const SUN_BOOST = 8;
export const MAX_POINTS = 100;

// Stage thresholds (lower-bound inclusive)
const STAGE_THRESHOLDS = [
  { stage: 6, min: 85 },
  { stage: 5, min: 68 },
  { stage: 4, min: 51 },
  { stage: 3, min: 34 },
  { stage: 2, min: 17 },
  { stage: 1, min: 0 },
];

// ── Types ────────────────────────────────────────────────────

export interface PlantState {
  coupleId: string;
  growthPoints: number;      // after decay applied
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  lastWateredAt: Date | null;
  lastSunnedAt: Date | null;
  updatedAt: Date;
  /** "needs-water" | "needs-sun" | "happy" */
  status: "needs-water" | "needs-sun" | "happy";
}

interface PlantRow {
  couple_id: string;
  growth_points: number;
  last_watered_at: string | null;
  last_sunned_at: string | null;
  updated_at: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────

export function computeStage(growthPoints: number): 1 | 2 | 3 | 4 | 5 | 6 {
  for (const { stage, min } of STAGE_THRESHOLDS) {
    if (growthPoints >= min) return stage as 1 | 2 | 3 | 4 | 5 | 6;
  }
  return 1;
}

function applyDecay(points: number, updatedAt: Date): number {
  const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  return Math.max(0, points - hoursSince * DECAY_RATE_PER_HOUR);
}

function computeStatus(
  lastWateredAt: Date | null,
  lastSunnedAt: Date | null
): PlantState["status"] {
  const now = Date.now();
  const H24 = 24 * 60 * 60 * 1000;
  const waterOld = !lastWateredAt || now - lastWateredAt.getTime() > H24;
  const sunOld = !lastSunnedAt || now - lastSunnedAt.getTime() > H24;
  if (waterOld) return "needs-water";
  if (sunOld) return "needs-sun";
  return "happy";
}

function rowToState(row: PlantRow): PlantState {
  const updatedAt = new Date(row.updated_at);
  const rawPoints = row.growth_points;
  const growthPoints = applyDecay(rawPoints, updatedAt);
  const lastWateredAt = row.last_watered_at ? new Date(row.last_watered_at) : null;
  const lastSunnedAt = row.last_sunned_at ? new Date(row.last_sunned_at) : null;
  return {
    coupleId: row.couple_id,
    growthPoints,
    stage: computeStage(growthPoints),
    lastWateredAt,
    lastSunnedAt,
    updatedAt,
    status: computeStatus(lastWateredAt, lastSunnedAt),
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Fetch the couple's plant, creating it if it doesn't exist yet.
 * Returns PlantState with decay applied.
 */
export async function getOrCreatePlant(coupleId: string): Promise<PlantState> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await (supabase.from("couple_plant") as any)
    .select("*")
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch couple_plant:", error);
    throw new Error(error.message);
  }

  if (data) {
    return rowToState(data as PlantRow);
  }

  // Create new row
  const { data: created, error: insertErr } = await (supabase.from("couple_plant") as any)
    .insert({ couple_id: coupleId })
    .select()
    .single();

  if (insertErr || !created) {
    // Could happen if a concurrent insert raced us — try fetching once more
    const { data: retry } = await (supabase.from("couple_plant") as any)
      .select("*")
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (retry) return rowToState(retry as PlantRow);
    throw new Error(insertErr?.message ?? "Failed to create plant");
  }

  return rowToState(created as PlantRow);
}

/**
 * Water the plant: apply decay → +WATER_BOOST → update DB → log action.
 */
export async function water(coupleId: string, userId: string): Promise<PlantState> {
  return performAction(coupleId, userId, "water");
}

/**
 * Give the plant sunlight: apply decay → +SUN_BOOST → update DB → log action.
 */
export async function sun(coupleId: string, userId: string): Promise<PlantState> {
  return performAction(coupleId, userId, "sun");
}

async function performAction(
  coupleId: string,
  userId: string,
  action: "water" | "sun"
): Promise<PlantState> {
  const supabase = createSupabaseBrowserClient();

  // 1) Fetch current row
  const { data: row, error: fetchErr } = await (supabase.from("couple_plant") as any)
    .select("*")
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);

  let currentPoints = 10;
  let currentUpdatedAt = new Date();

  if (row) {
    currentUpdatedAt = new Date((row as PlantRow).updated_at);
    currentPoints = (row as PlantRow).growth_points;
  }

  // 2) Apply decay then boost
  const decayed = applyDecay(currentPoints, currentUpdatedAt);
  const boost = action === "water" ? WATER_BOOST : SUN_BOOST;
  const newPoints = Math.min(MAX_POINTS, decayed + boost);
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    growth_points: Math.round(newPoints),
    updated_at: now,
  };
  if (action === "water") patch.last_watered_at = now;
  if (action === "sun") patch.last_sunned_at = now;

  // 3) Upsert couple_plant
  if (!row) {
    const { data: upserted, error: upsertErr } = await (supabase.from("couple_plant") as any)
      .insert({ couple_id: coupleId, ...patch })
      .select()
      .single();
    if (upsertErr) throw new Error(upsertErr.message);
    await logAction(coupleId, userId, action);
    return rowToState(upserted as PlantRow);
  } else {
    const { data: updated, error: updateErr } = await (supabase.from("couple_plant") as any)
      .update(patch)
      .eq("couple_id", coupleId)
      .select()
      .single();
    if (updateErr) throw new Error(updateErr.message);
    await logAction(coupleId, userId, action);
    return rowToState(updated as PlantRow);
  }
}

async function logAction(coupleId: string, userId: string, action: "water" | "sun") {
  const supabase = createSupabaseBrowserClient();
  await (supabase.from("plant_actions") as any).insert({
    couple_id: coupleId,
    user_id: userId,
    action_type: action,
  });
}

/**
 * Reset the plant back to default (growth_points = 10, stage 1).
 */
export async function resetPlant(coupleId: string): Promise<PlantState> {
  const supabase = createSupabaseBrowserClient();
  const now = new Date().toISOString();

  const { data, error } = await (supabase.from("couple_plant") as any)
    .upsert({
      couple_id: coupleId,
      growth_points: 10,
      last_watered_at: now,
      last_sunned_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to reset plant");
  return rowToState(data as PlantRow);
}

/**
 * Subscribe to couple_plant changes. Returns an unsubscribe function.
 * Re-fetches the full row on any change and calls cb with fresh PlantState.
 */
export function subscribePlant(
  coupleId: string,
  cb: (state: PlantState) => void
): () => void {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`couple-plant-${coupleId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "couple_plant",
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        getOrCreatePlant(coupleId).then(cb).catch(console.error);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
