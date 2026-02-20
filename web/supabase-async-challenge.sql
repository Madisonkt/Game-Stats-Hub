-- ============================================================
-- ASYNC CHALLENGE MODE — Supabase Migration
-- Run this entire block in the Supabase SQL Editor.
-- ============================================================

-- ── 1) Add new columns to rounds ─────────────────────────────

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS reveal_status text NOT NULL DEFAULT 'hidden',
  ADD COLUMN IF NOT EXISTS submitted_user_ids uuid[] NOT NULL DEFAULT '{}';

-- ── 2) Update solves SELECT policy for async privacy ──────────
-- Drop the old permissive policy that lets any couple member see all solves.
DROP POLICY IF EXISTS "solves: select for couple members" ON public.solves;

-- New policy:
--   • A user can always SELECT their own solve row.
--   • A user can SELECT a partner's solve only if the round is live mode
--     OR the round has been revealed (reveal_status = 'revealed').
CREATE POLICY "solves: select own or revealed"
  ON public.solves FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = solves.round_id
        AND public.is_couple_member(r.couple_id)
        AND (r.mode = 'live' OR r.reveal_status = 'revealed')
    )
  );

-- ── 3) Index for quick reveal-status lookups ──────────────────
CREATE INDEX IF NOT EXISTS idx_rounds_reveal_status ON public.rounds(reveal_status);
CREATE INDEX IF NOT EXISTS idx_rounds_mode          ON public.rounds(mode);
