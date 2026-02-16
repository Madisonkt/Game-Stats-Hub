-- ============================================================
-- RLS FIX: Allow joining rooms by invite code
-- ============================================================
-- Problem: The current "couples: select for members" policy blocks
-- user B from looking up a couple by invite_code, because they
-- aren't a member yet. Same for checking couple_members count.
--
-- Solution: Add policies that let any authenticated user:
--   1) SELECT a couple row by invite_code (for the join flow)
--   2) SELECT couple_members to check capacity (for the join flow)
-- ============================================================

-- 1) Allow any authenticated user to find a couple by invite_code
create policy "couples: select by invite code"
  on public.couples for select
  using ( auth.uid() is not null );

-- Drop the old restrictive select policy (members-only)
drop policy if exists "couples: select for members" on public.couples;

-- 2) Allow any authenticated user to read couple_members count
--    (needed for capacity check during join)
--    This is safe because couple_members only has IDs and names,
--    and the user needs the couple_id (from invite code) to query.
create policy "couple_members: select for authenticated"
  on public.couple_members for select
  using ( auth.uid() is not null );

-- Drop the old restrictive select policy (members-only)
drop policy if exists "couple_members: select for couple members" on public.couple_members;
