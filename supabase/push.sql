-- The 90-Day Era: reminders that arrive with the app closed.
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to run again.
-- Before running, replace PASTE_CRON_SECRET_HERE (near the bottom) with the CRON_SECRET value
-- from the push-keys.local file.

-- Each device that has reminders switched on.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "own devices: read"   on public.push_subscriptions;
drop policy if exists "own devices: insert" on public.push_subscriptions;
drop policy if exists "own devices: update" on public.push_subscriptions;
drop policy if exists "own devices: delete" on public.push_subscriptions;
create policy "own devices: read"   on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own devices: insert" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own devices: update" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own devices: delete" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

-- The coming week of reminders, written by the app and sent by the scheduled job.
create table if not exists public.push_reminders (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fire_at timestamptz not null,
  title   text not null,
  body    text not null,
  url     text not null default '/today',
  sent_at timestamptz
);
create index if not exists push_reminders_due on public.push_reminders (fire_at) where sent_at is null;
create index if not exists push_reminders_user on public.push_reminders (user_id);
alter table public.push_reminders enable row level security;

drop policy if exists "own reminders: read"   on public.push_reminders;
drop policy if exists "own reminders: insert" on public.push_reminders;
drop policy if exists "own reminders: delete" on public.push_reminders;
create policy "own reminders: read"   on public.push_reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "own reminders: insert" on public.push_reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own reminders: delete" on public.push_reminders for delete to authenticated using ((select auth.uid()) = user_id);

-- Every five minutes, ask the send-reminders function to deliver whatever is due.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'era-send-reminders',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url     := 'https://winpxkeppgfkrptnohfr.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'PASTE_CRON_SECRET_HERE'),
    body    := '{}'::jsonb
  );
  $job$
);
