-- 0004 — Social layer, profiles, secret rules, catch-up batching.
--
-- ⚠️  ALREADY APPLIED TO DEV. You do not need to run this again there.
--     It is committed so the repo's migration history matches the database,
--     and so PRODUCTION can be brought up to the same schema later
--     (run 0001 -> 0002 -> 0003 -> 0004 -> 0005 in order — start.md §9).
--
-- IS RE-RUNNING SAFE? Yes. Verified statement by statement:
--   * every `alter table` is `add column if not exists` -> no-op if present
--   * every `create table` / `create index` is `if not exists`   -> no-op
--   * `enable row level security` is idempotent
--   * `create or replace function` swaps a body, touching no rows
--   * the storage bucket insert is `on conflict do nothing`
--   * `drop policy if exists` + `create policy` re-creates an IDENTICAL rule.
--     This drops an authorization rule, never data. It is what makes the file
--     re-runnable at all (plain `create policy` errors if one exists).
--
--   There is NO drop table, delete, truncate, drop column, or update of
--   existing rows anywhere in this file. Contrast 0002, which does
--   `drop column if exists current_day` — that is the kind of statement this
--   file deliberately has none of.
--
-- The whole thing runs in ONE TRANSACTION, so a failure part-way rolls
-- everything back rather than leaving a policy dropped-but-not-recreated.
--
-- Sanity check either way — run before and after, the counts must match:
--   select (select count(*) from public.users)      as users,
--          (select count(*) from public.rules)      as rules,
--          (select count(*) from public.daily_logs) as logs;

begin;

-- users: profile fields + timezone (required, not nullable — see Phase 1)
alter table public.users
  add column if not exists timezone     text not null default 'UTC',
  add column if not exists location     text,
  add column if not exists avatar_url   text;

-- rules: secret flag
alter table public.rules
  add column if not exists is_secret boolean not null default false;

-- users: per-account preference for how secret rules appear to OTHERS.
-- 'placeholder' (default) = non-owners see "Secret Rule N" wherever the real
-- title would go (rules list, feed rule-chips). 'hidden' = secret rules are
-- omitted entirely from both surfaces for non-owners — as if they don't
-- exist. Never affects what the owner sees on their own device either way.
alter table public.users
  add column if not exists secret_rules_visibility text not null default 'placeholder'
    check (secret_rules_visibility in ('placeholder', 'hidden'));

-- daily_logs: catch-up batching
alter table public.daily_logs
  add column if not exists batch_id uuid;
create index if not exists daily_logs_batch_id_idx on public.daily_logs(batch_id) where batch_id is not null;

-- New table: challenge-lifecycle announcements (currently just resets). A
-- reset isn't a completed/shielded day, so it can't be a daily_logs row —
-- it's a separate, minimal event log, optionally surfaced on the feed at the
-- user's choice at reset time.
create table if not exists public.challenge_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('reset')),
  created_at timestamptz not null default now()
);
alter table public.challenge_events enable row level security;
create index if not exists challenge_events_user_id_idx on public.challenge_events(user_id);
create index if not exists challenge_events_created_at_idx on public.challenge_events(created_at desc);

-- Same visibility model as everything else in this positive-only feed: any
-- signed-in user can read any event (it only ever exists if its owner chose
-- to announce it — see restartChallenge's new `announceToFeed` param).
drop policy if exists challenge_events_select on public.challenge_events;
create policy challenge_events_select on public.challenge_events
  for select to authenticated using (true);
drop policy if exists challenge_events_write on public.challenge_events;
create policy challenge_events_write on public.challenge_events
  for insert to authenticated with check (auth.uid() = user_id);

-- New table: real reciprocal follow relationship (distinct from user_unfollows,
-- which only ever hides posts one-directionally and stays as-is).
create table if not exists public.user_follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followed_id uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id != followed_id)
);
alter table public.user_follows enable row level security;

-- SELECT restricted to the two parties in the relationship — a third party
-- querying "who follows Bob" gets zero rows. This is what makes "followers/
-- following visible only on your own profile" a real guarantee, not a UI skip.
drop policy if exists user_follows_select on public.user_follows;
create policy user_follows_select on public.user_follows
  for select to authenticated
  using (auth.uid() = follower_id or auth.uid() = followed_id);

-- Only the follower can create/remove their own follow — not consentful like
-- a friend request.
drop policy if exists user_follows_write on public.user_follows;
create policy user_follows_write on public.user_follows
  for all to authenticated
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- RPC: masks (or omits) secret rule titles server-side, per the owner's own
-- secret_rules_visibility preference. The literal DB row is never selectable
-- with its real title by a non-owner — client-side masking of a permissive
-- `using(true)` SELECT would leak the real title over the wire regardless of
-- what the UI chooses to render.
--
-- Owner viewing their own rules (auth.uid() = target_user_id): always full,
-- real data, unaffected by their own visibility setting — that setting only
-- ever controls what OTHER people see.
create or replace function public.get_visible_rules(target_user_id uuid)
returns table(id uuid, title text, schedule_type text, custom_days int[], "position" int, is_secret boolean)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    case
      when auth.uid() = target_user_id or not r.is_secret then r.title
      else 'Secret Rule ' || row_number() over (
        partition by (r.is_secret and auth.uid() != target_user_id)
        order by r.position
      )::text
    end as title,
    r.schedule_type,
    r.custom_days,
    r.position,
    r.is_secret
  from public.rules r
  join public.users u on u.id = r.user_id
  where r.user_id = target_user_id
    and (
      auth.uid() = target_user_id
      or not r.is_secret
      or u.secret_rules_visibility = 'placeholder'
      -- when 'hidden' and viewer != owner and the rule is secret, this row
      -- is excluded from the result set entirely — not returned at all,
      -- not even as a placeholder.
    )
  order by r.position;
$$;
grant execute on function public.get_visible_rules(uuid) to authenticated;

-- Fix: the day-7 rule-change trigger currently compares against now()::date,
-- i.e. the DB server's session timezone (UTC), independent of the owner's
-- timezone. Once "today" becomes owner-timezone-aware client-side, this
-- becomes a second, differently-timezoned source of truth for the exact same
-- boundary (~24h window of inconsistency for users far from UTC). Redefine
-- using the owner's stored timezone.
create or replace function public.enforce_rules_change_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge public.users%rowtype;
  target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  select * into challenge from public.users where id = target_user;
  if not found then
    return coalesce(new, old);
  end if;

  if now() < challenge.created_at + interval '2 minutes' then
    return coalesce(new, old);
  end if;

  if (now() at time zone coalesce(challenge.timezone, 'UTC'))::date < challenge.start_date + 7 then
    raise exception 'Rules can only be changed from day 8 onwards'
      using errcode = 'check_violation';
  end if;

  if challenge.rules_changed_at is not null then
    raise exception 'The one-time rule change has already been used'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

-- Storage: avatar uploads. Same path convention as proof-photos
-- (<user-id>/<filename>), public read, owner-only write.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- Verification (run separately, AFTER the commit above). Zero rows means the
-- schema has everything the app needs — checking COLUMNS, not just tables,
-- per the lesson in start.md §9.
--
--   select c.tbl, c.col
--   from (values
--     ('users','timezone'), ('users','location'), ('users','avatar_url'),
--     ('users','secret_rules_visibility'),
--     ('rules','is_secret'), ('daily_logs','batch_id')
--   ) as c(tbl, col)
--   where not exists (
--     select 1 from information_schema.columns i
--     where i.table_schema = 'public'
--       and i.table_name = c.tbl and i.column_name = c.col
--   );
