-- ============================================================
-- PHASE 3: Supabase Schema — couples, rounds, solves
-- Paste this entire block into the Supabase SQL Editor and run.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1) couples
-- ──────────────────────────────────────────────────────────────
create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  status      text not null default 'waiting',   -- 'waiting' | 'ready'
  max_members int  not null default 2,
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2) couple_members
-- ──────────────────────────────────────────────────────────────
create table if not exists public.couple_members (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  unique(couple_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- 3) rounds
-- ──────────────────────────────────────────────────────────────
create table if not exists public.rounds (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  game_key        text not null default 'rubiks',
  origin_id       text not null,
  scramble        text not null,
  status          text not null default 'open',   -- 'open' | 'in_progress' | 'closed'
  created_by      uuid references auth.users(id),
  joined_user_ids uuid[] not null default '{}',
  started_at      timestamptz not null default now(),
  closed_at       timestamptz,
  unique(couple_id, origin_id)
);

-- ──────────────────────────────────────────────────────────────
-- 4) solves
-- ──────────────────────────────────────────────────────────────
create table if not exists public.solves (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.rounds(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  origin_id  text not null,
  time_ms    int,
  dnf        boolean not null default false,
  created_at timestamptz not null default now(),
  unique(round_id, user_id),
  unique(round_id, origin_id)
);

-- ──────────────────────────────────────────────────────────────
-- 5) migration_state (optional, kept for future use)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.migration_state (
  couple_id       uuid primary key references public.couples(id) on delete cascade,
  migrated_at     timestamptz,
  local_device_id text
);


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: "is this user a member of the given couple?"
-- Used by almost every policy below.
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

-- ── couples ──────────────────────────────────────────────────

alter table public.couples enable row level security;

create policy "couples: select for members"
  on public.couples for select
  using ( public.is_couple_member(id) );

create policy "couples: insert for authenticated"
  on public.couples for insert
  with check ( auth.uid() is not null );

create policy "couples: update for members"
  on public.couples for update
  using ( public.is_couple_member(id) )
  with check ( public.is_couple_member(id) );

create policy "couples: delete for members"
  on public.couples for delete
  using ( public.is_couple_member(id) );

-- ── couple_members ───────────────────────────────────────────

alter table public.couple_members enable row level security;

create policy "couple_members: select for couple members"
  on public.couple_members for select
  using ( public.is_couple_member(couple_id) );

-- INSERT: only your own row, and only if couple has < max_members
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

create policy "couple_members: update own row"
  on public.couple_members for update
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy "couple_members: delete own row"
  on public.couple_members for delete
  using ( user_id = auth.uid() );

-- ── rounds ───────────────────────────────────────────────────

alter table public.rounds enable row level security;

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

-- ── solves ───────────────────────────────────────────────────

alter table public.solves enable row level security;

-- SELECT: allowed if you're a member of the couple for that round
create policy "solves: select for couple members"
  on public.solves for select
  using (
    exists (
      select 1 from public.rounds r
      where r.id = solves.round_id
        and public.is_couple_member(r.couple_id)
    )
  );

-- INSERT: only your own solve, and you must be in the couple
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


-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime on the tables that need live sync
alter publication supabase_realtime add table public.couple_members;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.solves;


-- ============================================================
-- INDEXES (performance)
-- ============================================================

create index if not exists idx_couple_members_couple_id on public.couple_members(couple_id);
create index if not exists idx_couple_members_user_id   on public.couple_members(user_id);
create index if not exists idx_rounds_couple_id         on public.rounds(couple_id);
create index if not exists idx_rounds_status            on public.rounds(status);
create index if not exists idx_solves_round_id          on public.solves(round_id);
create index if not exists idx_solves_user_id           on public.solves(user_id);
create index if not exists idx_couples_invite_code      on public.couples(invite_code);
