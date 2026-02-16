/** Supabase row types — mirrors the SQL schema */

export interface CoupleRow {
  id: string;
  invite_code: string;
  status: "waiting" | "ready";
  max_members: number;
  created_at: string;
}

export interface CoupleMemberRow {
  id: string;
  couple_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface RoundRow {
  id: string;
  couple_id: string;
  game_key: string;
  origin_id: string;
  scramble: string;
  status: "open" | "in_progress" | "closed";
  created_by: string | null;
  joined_user_ids: string[];
  started_at: string;
  closed_at: string | null;
}

export interface SolveRow {
  id: string;
  round_id: string;
  user_id: string;
  origin_id: string;
  time_ms: number | null;
  dnf: boolean;
  created_at: string;
}
