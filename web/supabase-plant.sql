-- ============================================================
-- Couple Plant: couple_plant + plant_actions tables
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1) couple_plant  (one row per couple)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.couple_plant (
  couple_id        uuid primary key references public.couples(id) on delete cascade,
  growth_points    int        not null default 10,
  last_watered_at  timestamptz,
  last_sunned_at   timestamptz,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2) plant_actions  (event log)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.plant_actions (
  id          uuid        primary key default gen_random_uuid(),
  couple_id   uuid        not null references public.couples(id) on delete cascade,
  user_id     uuid        not null references auth.users(id)    on delete cascade,
  action_type text        not null,   -- 'water' | 'sun'
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3) Enable Realtime
-- ──────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.couple_plant;
alter publication supabase_realtime add table public.plant_actions;

-- ──────────────────────────────────────────────────────────────
-- 4) RLS
-- ──────────────────────────────────────────────────────────────
alter table public.couple_plant  enable row level security;
alter table public.plant_actions enable row level security;

-- Helper: is the current user a member of the given couple?
-- (re-used inline in each policy)

-- couple_plant: SELECT
create policy "couple_plant_select"
  on public.couple_plant for select
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_plant.couple_id
        and cm.user_id   = auth.uid()
    )
  );

-- couple_plant: INSERT
create policy "couple_plant_insert"
  on public.couple_plant for insert
  with check (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_plant.couple_id
        and cm.user_id   = auth.uid()
    )
  );

-- couple_plant: UPDATE
create policy "couple_plant_update"
  on public.couple_plant for update
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_plant.couple_id
        and cm.user_id   = auth.uid()
    )
  );

-- plant_actions: SELECT
create policy "plant_actions_select"
  on public.plant_actions for select
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = plant_actions.couple_id
        and cm.user_id   = auth.uid()
    )
  );

-- plant_actions: INSERT
create policy "plant_actions_insert"
  on public.plant_actions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = plant_actions.couple_id
        and cm.user_id   = auth.uid()
    )
  );
