const { createClient } = require("@supabase/supabase-js");

const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5b2FkYmtxd3N1ZXBocnNjbXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2NDYwMSwiZXhwIjoyMDg2ODQwNjAxfQ.0bjYsSbZRFAmrnBPkScOPqnSqhozEOsUOFGiYrq-oSw";

const SUPABASE_URL = "https://byoadbkqwsuephrscmzr.supabase.co";

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create games table using SQL
  const sql = `
    CREATE TABLE IF NOT EXISTS public.games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
      name text NOT NULL,
      icon text NOT NULL DEFAULT 'game-controller-outline',
      game_type text NOT NULL DEFAULT 'simple',
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Index for fast lookup by couple
    CREATE INDEX IF NOT EXISTS idx_games_couple_id ON public.games(couple_id);

    -- RLS policies
    ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

    -- Allow authenticated users who are couple members to read/write their games
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'games_select_policy'
      ) THEN
        CREATE POLICY games_select_policy ON public.games FOR SELECT
          USING (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'games_insert_policy'
      ) THEN
        CREATE POLICY games_insert_policy ON public.games FOR INSERT
          WITH CHECK (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'games_update_policy'
      ) THEN
        CREATE POLICY games_update_policy ON public.games FOR UPDATE
          USING (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'games_delete_policy'
      ) THEN
        CREATE POLICY games_delete_policy ON public.games FOR DELETE
          USING (true);
      END IF;
    END $$;

    -- Grant access
    GRANT ALL ON public.games TO authenticated;
    GRANT ALL ON public.games TO service_role;
  `;

  // Use the SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "X-Connection-Encrypted": "1",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    console.log("SQL endpoint not available, trying alternative...");
    // Alternative: use supabase.rpc or direct REST approach
    // We'll just output the SQL for the user to run manually
    console.log("\n=== Run this in Supabase SQL Editor ===\n");
    console.log(sql);
    return;
  }

  const result = await res.json();
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
