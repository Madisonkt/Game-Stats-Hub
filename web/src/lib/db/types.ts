/** Supabase row types — mirrors the SQL schema */

export type GameType = "simple" | "timed";

export interface GameRow {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  game_type: GameType;
  is_archived: boolean;
  created_at: string;
}

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
  mode: string;                    // 'live' | 'async'
  reveal_status: string;           // 'hidden' | 'revealed'
  submitted_user_ids: string[];    // users who have submitted a solve
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
