-- 0006 — EXPAND: commitment tiers, text-based hype phrases, update announcements.
--
-- Apply after 0005. Runs in one transaction; a failure rolls back completely.
-- Schema confirmed current on dev and production (0001 → 0005 applied to both).
--
-- ============================================================================
-- THIS MIGRATION DOES NOT DROP ANYTHING. See supabase.md §1 (Expand/Contract).
-- ============================================================================
--
-- It only ADDS columns, BACKFILLS them with behaviour-preserving values, and
-- RELAXES old constraints. The old `reaction_type` / `reaction_count` columns
-- and the now-unused `user_follows` table are deliberately LEFT IN PLACE so
-- that redeploying the previous app version still works. They are removed by
-- 0007_contract_hype_follows.sql — a LATER release, only once this one has run
-- clean in production.
--
-- ONE RECOVERABLE DELETE: the new hype model allows one phrase per person per
-- post, so `unique (log_id, sender_id)` cannot be added while a sender holds
-- two old emoji reactions on the same post. Before removing any duplicate this
-- migration snapshots the ENTIRE reactions table into
-- `public.reactions_backup_0006`, inside this same transaction. Nothing is
-- unrecoverable: restore with
--     insert into public.reactions select * from public.reactions_backup_0006
--     on conflict do nothing;
-- The backup table is dropped by 0007, not here.
--
-- BEFORE AND AFTER, compare (supabase.md §2). users / rules / daily_logs /
-- user_unfollows must be IDENTICAL. reactions may fall by exactly the
-- "collapsed" count this migration prints:
--
--   select (select count(*) from public.users)          as users,
--          (select count(*) from public.rules)          as rules,
--          (select count(*) from public.daily_logs)     as logs,
--          (select count(*) from public.reactions)      as reactions,
--          (select count(*) from public.user_unfollows) as unfollows;

begin;

-- ---------------------------------------------------------------------------
-- 1. Commitment tiers
--
-- 'classic' is the default precisely BECAUSE it is what every pre-existing
-- account already experiences: exactly one shield for the attempt. Nobody's
-- difficulty changes under them (supabase.md §0 Rule 2.1). They are then
-- OFFERED the new choice via the announcement in §3 below.
--
-- shields_remaining stays on the table but is no longer read by the app —
-- src/lib/shield-policy.ts derives availability from commitment_level and
-- last_shield_used_at, the same "derive, don't store a counter" approach the
-- schema already uses for current_day. Removed in 0007.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists commitment_level text not null default 'classic'
    check (commitment_level in ('purist', 'classic', 'flex')),
  add column if not exists last_shield_used_at date;

-- A spent shield stays spent. Any non-null date means "used" for 'classic'
-- semantics; updated_at is the most honest value available, since no
-- shield-spend timestamp was ever recorded before now.
update public.users
   set last_shield_used_at = updated_at::date
 where shields_remaining = 0
   and last_shield_used_at is null;

-- ---------------------------------------------------------------------------
-- 2. Hype phrases replace the fixed 4-emoji enum
-- ---------------------------------------------------------------------------

-- Full snapshot BEFORE touching a single row (supabase.md §3).
create table if not exists public.reactions_backup_0006 as
  select * from public.reactions;

-- Nobody but service_role should read the backup.
alter table public.reactions_backup_0006 enable row level security;

alter table public.reactions add column if not exists phrase_id text;

-- Preserve every existing reaction by mapping its old type to the matching
-- legacy phrase id shipped in src/lib/hype-phrases.ts. No-op on empty tables.
update public.reactions
   set phrase_id = 'legacy-' || reaction_type
 where phrase_id is null
   and reaction_type is not null;

-- Relax the OLD columns rather than dropping them, so the previous app version
-- keeps working if we have to roll the code back.
alter table public.reactions alter column reaction_type  drop not null;
alter table public.reactions alter column reaction_count drop not null;

-- Drop the old CHECK and the old 3-column UNIQUE by locating them dynamically
-- rather than guessing a name — 0002_align_schema.sql shows this table's
-- constraint names differ across databases depending on which blueprint
-- created it first. Dropping a constraint removes no data.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.reactions'::regclass
       and (
         (contype = 'c' and pg_get_constraintdef(oid) like '%reaction_type%')
         or (contype = 'u' and conkey = array(
              select attnum from pg_attribute
               where attrelid = 'public.reactions'::regclass
                 and attname in ('log_id', 'sender_id', 'reaction_type')
               order by attnum
            ))
       )
  loop
    execute format('alter table public.reactions drop constraint %I', c.conname);
  end loop;
end $$;

-- Collapse to one reaction per (log, sender), keeping the most recent.
-- Recoverable from reactions_backup_0006 above.
do $$
declare
  collapsed_count int;
begin
  with ranked as (
    select id, row_number() over (
      partition by log_id, sender_id order by updated_at desc, id desc
    ) as rn
    from public.reactions
  )
  delete from public.reactions r
  using ranked
  where r.id = ranked.id and ranked.rn > 1;

  get diagnostics collapsed_count = row_count;
  raise notice 'reactions: collapsed % duplicate row(s); full snapshot kept in public.reactions_backup_0006', collapsed_count;
end $$;

alter table public.reactions alter column phrase_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.reactions'::regclass
                    and conname = 'reactions_phrase_id_length') then
    alter table public.reactions
      add constraint reactions_phrase_id_length check (length(phrase_id) <= 64);
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.reactions'::regclass
                    and conname = 'reactions_log_sender_key') then
    alter table public.reactions
      add constraint reactions_log_sender_key unique (log_id, sender_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Update announcements — how existing accounts are offered new features
--
-- supabase.md §5. Backfilling a default is only half the job; a user who was
-- silently defaulted never actually chose. This column records which changes
-- an account has already been shown, so the prompt appears once per account
-- across every device (which is why it lives here and not in localStorage).
--
-- Deliberately left EMPTY for existing accounts, so they all see the
-- commitment-level prompt. New signups pick a tier during onboarding and have
-- the key written at creation time, so they never see it.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists acknowledged_updates text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 4. user_follows is now unused by the app (the feed only ever read
-- user_unfollows). It is NOT dropped here — 0007 does that, after this
-- release has proven out. Leaving it costs nothing and keeps rollback open.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. Close the self-hide hole found in the audit — user_unfollows never had
-- the check that user_follows had.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.user_unfollows'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%follower_id%unfollowed_id%'
  ) then
    alter table public.user_unfollows
      add constraint user_unfollows_no_self check (follower_id != unfollowed_id);
  end if;
end $$;

-- Directory sorts by created_at; there was no index for it.
create index if not exists users_created_at_idx on public.users(created_at desc);

commit;

-- ---------------------------------------------------------------------------
-- VERIFICATION — run separately, after the commit. Zero rows means correct.
-- ---------------------------------------------------------------------------
--   select c.tbl, c.col
--   from (values
--     ('users','commitment_level'), ('users','last_shield_used_at'),
--     ('users','acknowledged_updates'), ('reactions','phrase_id')
--   ) as c(tbl, col)
--   where not exists (
--     select 1 from information_schema.columns i
--      where i.table_schema = 'public'
--        and i.table_name = c.tbl and i.column_name = c.col
--   );
--
-- And confirm every reaction carries a phrase (must return 0):
--   select count(*) from public.reactions where phrase_id is null;
