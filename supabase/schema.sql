-- The 90-Day Era: cloud sync storage.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.era_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.era_state enable row level security;

-- Each person can only ever see and change their own row.
drop policy if exists "own row: read"   on public.era_state;
drop policy if exists "own row: insert" on public.era_state;
drop policy if exists "own row: update" on public.era_state;
drop policy if exists "own row: delete" on public.era_state;

create policy "own row: read"   on public.era_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.era_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.era_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.era_state for delete to authenticated using ((select auth.uid()) = user_id);
