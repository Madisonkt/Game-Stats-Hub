-- ============================================================
-- ATOMIC SOLVE SUBMISSION TRACKING
-- Run this in the Supabase SQL Editor once.
--
-- Replaces the unsafe read-modify-write in trackSolveSubmitted
-- with a single atomic UPDATE that uses array_append only when
-- the user isn't already in submitted_user_ids.  This prevents
-- the race condition where two near-simultaneous submits can
-- overwrite each other.
-- ============================================================

create or replace function public.append_submitted_user_id(
  p_round_id uuid,
  p_user_id  uuid
)
returns setof public.rounds
language sql
security definer
as $$
  update public.rounds
  set submitted_user_ids = array_append(submitted_user_ids, p_user_id)
  where id = p_round_id
    and not (p_user_id = any(submitted_user_ids))
  returning *;
$$;

-- Grant execute to authenticated users
grant execute on function public.append_submitted_user_id(uuid, uuid) to authenticated;
