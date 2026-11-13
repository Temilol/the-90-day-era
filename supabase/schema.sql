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

-- Progress photos: a private bucket where each person can only reach their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

drop policy if exists "own photos: read"   on storage.objects;
drop policy if exists "own photos: insert" on storage.objects;
drop policy if exists "own photos: delete" on storage.objects;

create policy "own photos: read"   on storage.objects for select to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos: insert" on storage.objects for insert to authenticated with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos: delete" on storage.objects for delete to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Lets a signed-in person delete their own account. Their saved progress row is removed with it.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
