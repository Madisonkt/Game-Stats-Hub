/**
 * Supabase Database type definitions.
 * Mirrors the SQL schema from supabase-migration.sql.
 *
 * These types are passed as a generic to createClient<Database>()
 * so that .from("table") calls are properly typed.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string;
          invite_code: string;
          status: string;
          max_members: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_code: string;
          status?: string;
          max_members?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
          status?: string;
          max_members?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      couple_members: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
        ];
      };
      rounds: {
        Row: {
          id: string;
          couple_id: string;
          game_key: string;
          origin_id: string;
          scramble: string;
          status: string;
          created_by: string | null;
          joined_user_ids: string[];
          started_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          couple_id: string;
          game_key?: string;
          origin_id: string;
          scramble: string;
          status?: string;
          created_by?: string | null;
          joined_user_ids?: string[];
          started_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          couple_id?: string;
          game_key?: string;
          origin_id?: string;
          scramble?: string;
          status?: string;
          created_by?: string | null;
          joined_user_ids?: string[];
          started_at?: string;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
        ];
      };
      solves: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          origin_id: string;
          time_ms: number | null;
          dnf: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          user_id: string;
          origin_id: string;
          time_ms?: number | null;
          dnf?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          user_id?: string;
          origin_id?: string;
          time_ms?: number | null;
          dnf?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solves_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      migration_state: {
        Row: {
          user_id: string;
          migrated_at: string;
        };
        Insert: {
          user_id: string;
          migrated_at?: string;
        };
        Update: {
          user_id?: string;
          migrated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_couple_member: {
        Args: {
          _couple_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
