-- ============================================================
-- SOLVES RLS — Reveal guard
-- Run this in the Supabase SQL Editor once.
--
-- The previous policy allowed couple members to read ALL solves
-- for their rounds regardless of reveal_status.  This meant
-- Player 1 could see Player 2's time the instant they saved it,
-- before the round was revealed.
--
-- New policy: a solve is visible if it's your own, OR if the
-- parent round is revealed/closed.
-- ============================================================

-- Drop the old policy
drop policy if exists "solves: select for couple members" on public.solves;

-- Always see your own solve (needed so your time shows on your screen)
create policy "solves: select own solve"
  on public.solves for select
  using ( user_id = auth.uid() );

-- See partner's solve only once the round is revealed/closed
create policy "solves: select partner solve when revealed"
  on public.solves for select
  using (
    exists (
      select 1 from public.rounds r
      where r.id = solves.round_id
        and public.is_couple_member(r.couple_id)
        and (r.reveal_status = 'revealed' or r.status = 'closed')
    )
  );
