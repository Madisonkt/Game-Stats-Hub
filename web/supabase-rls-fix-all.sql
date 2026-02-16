-- ============================================================
-- COMPREHENSIVE RLS FIX — Run this in Supabase SQL Editor
-- Drops ALL existing policies and recreates them correctly.
-- ============================================================

-- ── Helper function ──────────────────────────────────────────
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id
      and user_id = auth.uid()
  );
$$;

-- ── Enable RLS on all tables ─────────────────────────────────
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.rounds enable row level security;
alter table public.solves enable row level security;

-- ══════════════════════════════════════════════════════════════
-- DROP all existing policies (ignore errors for non-existent ones)
-- ══════════════════════════════════════════════════════════════

-- couples
drop policy if exists "couples: select for members" on public.couples;
drop policy if exists "couples: select by invite code" on public.couples;
drop policy if exists "couples: select for authenticated" on public.couples;
drop policy if exists "couples: insert for authenticated" on public.couples;
drop policy if exists "couples: update for members" on public.couples;
drop policy if exists "couples: delete for members" on public.couples;

-- couple_members
drop policy if exists "couple_members: select for couple members" on public.couple_members;
drop policy if exists "couple_members: select for authenticated" on public.couple_members;
drop policy if exists "couple_members: insert own row if room" on public.couple_members;
drop policy if exists "couple_members: update own row" on public.couple_members;
drop policy if exists "couple_members: delete own row" on public.couple_members;

-- rounds
drop policy if exists "rounds: select for couple members" on public.rounds;
drop policy if exists "rounds: insert for couple members" on public.rounds;
drop policy if exists "rounds: update for couple members" on public.rounds;
drop policy if exists "rounds: delete for couple members" on public.rounds;

-- solves
drop policy if exists "solves: select for couple members" on public.solves;
drop policy if exists "solves: insert own solve" on public.solves;
drop policy if exists "solves: update own solve" on public.solves;
drop policy if exists "solves: delete own solve" on public.solves;

-- ══════════════════════════════════════════════════════════════
-- RECREATE all policies
-- ══════════════════════════════════════════════════════════════

-- ── couples ──────────────────────────────────────────────────

-- SELECT: any authenticated user (needed for invite code lookup)
create policy "couples: select for authenticated"
  on public.couples for select
  using ( auth.uid() is not null );

-- INSERT: any authenticated user can create a room
create policy "couples: insert for authenticated"
  on public.couples for insert
  with check ( auth.uid() is not null );

-- UPDATE: only members
create policy "couples: update for members"
  on public.couples for update
  using ( public.is_couple_member(id) )
  with check ( public.is_couple_member(id) );

-- DELETE: only members
create policy "couples: delete for members"
  on public.couples for delete
  using ( public.is_couple_member(id) );

-- ── couple_members ───────────────────────────────────────────

-- SELECT: any authenticated user (needed for capacity check during join)
create policy "couple_members: select for authenticated"
  on public.couple_members for select
  using ( auth.uid() is not null );

-- INSERT: only your own row, and only if couple has room
create policy "couple_members: insert own row if room"
  on public.couple_members for insert
  with check (
    user_id = auth.uid()
    and (
      select count(*) from public.couple_members cm
      where cm.couple_id = couple_members.couple_id
    ) < (
      select c.max_members from public.couples c
      where c.id = couple_members.couple_id
    )
  );

-- UPDATE: only your own row
create policy "couple_members: update own row"
  on public.couple_members for update
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- DELETE: only your own row
create policy "couple_members: delete own row"
  on public.couple_members for delete
  using ( user_id = auth.uid() );

-- ── rounds ───────────────────────────────────────────────────

create policy "rounds: select for couple members"
  on public.rounds for select
  using ( public.is_couple_member(couple_id) );

create policy "rounds: insert for couple members"
  on public.rounds for insert
  with check ( public.is_couple_member(couple_id) );

create policy "rounds: update for couple members"
  on public.rounds for update
  using ( public.is_couple_member(couple_id) )
  with check ( public.is_couple_member(couple_id) );

create policy "rounds: delete for couple members"
  on public.rounds for delete
  using ( public.is_couple_member(couple_id) );

-- ── solves ───────────────────────────────────────────────────

create policy "solves: select for couple members"
  on public.solves for select
  using (
    exists (
      select 1 from public.rounds r
      where r.id = solves.round_id
        and public.is_couple_member(r.couple_id)
    )
  );

create policy "solves: insert own solve"
  on public.solves for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.rounds r
      where r.id = solves.round_id
        and public.is_couple_member(r.couple_id)
    )
  );

create policy "solves: update own solve"
  on public.solves for update
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy "solves: delete own solve"
  on public.solves for delete
  using ( user_id = auth.uid() );
