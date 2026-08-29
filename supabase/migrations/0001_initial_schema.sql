-- 75 Challenge — initial schema
--
-- Apply to the dev Supabase project first, then production (see github.md §4).
--
-- ⚠️  `create table if not exists` only guards against the table EXISTING — not
--     against it having a different shape. If these tables were already created
--     from an older blueprint, creation is skipped and their old columns remain,
--     while the RLS/function sections below still apply. The result looks
--     applied but is missing columns. `0002_align_schema.sql` reconciles that;
--     always run 0001 → 0002 → 0003 in order on an existing database.
--
-- Design notes for future devs:
--   * `users.id` IS the Supabase auth user id. One auth account = one challenge.
--   * `current_day` is deliberately NOT stored. It is always derived from
--     `start_date` (see src/lib/date-utils.ts). A stored counter would drift.
--   * Restarting a challenge overwrites `start_date` and deletes the user's logs
--     rather than creating a second challenge row.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text not null,
  start_date        date not null,
  target_end_date   date not null,
  shields_remaining int  not null default 1 check (shields_remaining between 0 and 1),
  status            text not null default 'active'
                    check (status in ('active', 'failed', 'completed')),
  referred_by_id    uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  title         text not null,
  schedule_type text not null check (schedule_type in ('daily', 'workdays', 'custom')),
  -- 0 = Sunday … 6 = Saturday. Only meaningful when schedule_type = 'custom'.
  custom_days   int[] not null default '{}',
  -- Preserves the order the user arranged their rules in.
  position      int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists rules_user_id_idx on public.rules(user_id);

create table if not exists public.daily_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  log_date   date not null,
  status     text not null check (status in ('completed', 'shielded', 'failed')),
  photo_url  text,
  caption    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One log per user per day; re-checking a day updates it in place.
  unique (user_id, log_date)
);
create index if not exists daily_logs_user_id_idx  on public.daily_logs(user_id);
create index if not exists daily_logs_feed_idx     on public.daily_logs(created_at desc)
  where status in ('completed', 'shielded');

create table if not exists public.log_rule_checks (
  id           uuid primary key default gen_random_uuid(),
  log_id       uuid not null references public.daily_logs(id) on delete cascade,
  rule_id      uuid not null references public.rules(id) on delete cascade,
  is_completed boolean not null default false,
  unique (log_id, rule_id)
);
create index if not exists log_rule_checks_log_id_idx on public.log_rule_checks(log_id);

create table if not exists public.reactions (
  id             uuid primary key default gen_random_uuid(),
  log_id         uuid not null references public.daily_logs(id) on delete cascade,
  sender_id      uuid not null references public.users(id) on delete cascade,
  reaction_type  text not null check (reaction_type in ('fire', 'beast', 'launch', 'hype')),
  -- Reactions are multi-tap: one row per (log, sender, type) with a tally.
  reaction_count int  not null default 1 check (reaction_count > 0),
  updated_at     timestamptz not null default now(),
  unique (log_id, sender_id, reaction_type)
);
create index if not exists reactions_log_id_idx on public.reactions(log_id);

create table if not exists public.user_unfollows (
  follower_id   uuid not null references public.users(id) on delete cascade,
  unfollowed_id uuid not null references public.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, unfollowed_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The app only ever talks to Supabase with the anon key from the browser, so
-- these policies are the entire authorization model. Nothing is readable by
-- anonymous visitors: the feed requires login (start.md §5).
-- ---------------------------------------------------------------------------

alter table public.users           enable row level security;
alter table public.rules           enable row level security;
alter table public.daily_logs      enable row level security;
alter table public.log_rule_checks enable row level security;
alter table public.reactions       enable row level security;
alter table public.user_unfollows  enable row level security;

-- users: every signed-in participant can see every profile (names appear in the
-- feed), but may only create or edit their own.
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated using (true);

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- rules: readable by all signed-in users (feed cards list rule titles),
-- writable only by their owner.
drop policy if exists rules_select on public.rules;
create policy rules_select on public.rules
  for select to authenticated using (true);

drop policy if exists rules_write on public.rules;
create policy rules_write on public.rules
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_logs: the positive-only guarantee is enforced here, not just in the
-- client — other people's 'failed' days are never selectable.
drop policy if exists daily_logs_select on public.daily_logs;
create policy daily_logs_select on public.daily_logs
  for select to authenticated
  using (status in ('completed', 'shielded') or auth.uid() = user_id);

drop policy if exists daily_logs_write on public.daily_logs;
create policy daily_logs_write on public.daily_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- log_rule_checks: visibility follows the parent log.
drop policy if exists log_rule_checks_select on public.log_rule_checks;
create policy log_rule_checks_select on public.log_rule_checks
  for select to authenticated using (
    exists (
      select 1 from public.daily_logs l
      where l.id = log_id
        and (l.status in ('completed', 'shielded') or l.user_id = auth.uid())
    )
  );

drop policy if exists log_rule_checks_write on public.log_rule_checks;
create policy log_rule_checks_write on public.log_rule_checks
  for all to authenticated using (
    exists (select 1 from public.daily_logs l where l.id = log_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.daily_logs l where l.id = log_id and l.user_id = auth.uid())
  );

-- reactions: anyone signed in can see counts; you may only write your own.
-- There is no delete-others and no negative reaction type — the schema itself
-- makes downvotes unrepresentable (start.md §7).
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select to authenticated using (true);

drop policy if exists reactions_write on public.reactions;
create policy reactions_write on public.reactions
  for all to authenticated using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- user_unfollows: strictly private to the person who made them.
drop policy if exists user_unfollows_all on public.user_unfollows;
create policy user_unfollows_all on public.user_unfollows
  for all to authenticated
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- Storage: proof photos
--
-- Images are compressed to WebP < 200 KB in the browser before upload
-- (src/lib/image-compressor.ts) to stay inside the 1 GB free tier.
-- Objects are stored under "<user-id>/<filename>", which is what the policies
-- below key off.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('proof-photos', 'proof-photos', true)
on conflict (id) do nothing;

drop policy if exists proof_photos_read on storage.objects;
create policy proof_photos_read on storage.objects
  for select using (bucket_id = 'proof-photos');

drop policy if exists proof_photos_write on storage.objects;
create policy proof_photos_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'proof-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists proof_photos_update on storage.objects;
create policy proof_photos_update on storage.objects
  for update to authenticated using (
    bucket_id = 'proof-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists proof_photos_delete on storage.objects;
create policy proof_photos_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'proof-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Helper: total participant count, used for the cold-start rule
-- (< 2 users → the feed injects curated preview posts). Exposed as a function
-- so the client can ask for the count without needing to read every row.
-- ---------------------------------------------------------------------------

create or replace function public.participant_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.users;
$$;

grant execute on function public.participant_count() to authenticated;
