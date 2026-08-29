-- 75 Challenge — align a pre-existing schema with 0001
--
-- WHY THIS EXISTS
-- ---------------
-- 0001 creates its tables with `create table if not exists`. If the tables were
-- already present — created from the original blueprint in start.md §9 before
-- 0001 was written — that guard silently skips creation and the tables keep
-- their OLD shape, while everything after it in 0001 (RLS, policies, storage,
-- functions) still applies. The result looks applied but is missing columns:
--
--   users.updated_at        missing  → every profile/shield/restart write fails
--   rules.position          missing  → rule ordering and every rule write fails
--   daily_logs.updated_at   missing  → every check-in write fails
--   users.current_day       present  → contradicts start.md: the day is derived
--
-- This migration reconciles those differences. It is idempotent and safe to run
-- against a database that is already correct: every statement is guarded.
--
-- Run order: 0001 → 0002 → 0003.

-- --------------------------------------------------------------------------
-- users
-- --------------------------------------------------------------------------

alter table public.users
  add column if not exists updated_at timestamptz not null default now();

-- `current_day` must not be stored. It is always derived from `start_date`
-- (src/lib/date-utils.ts) — a stored counter drifts the moment anything writes
-- to one and not the other. Nothing in the application reads this column.
alter table public.users
  drop column if exists current_day;

-- --------------------------------------------------------------------------
-- rules
-- --------------------------------------------------------------------------

alter table public.rules
  add column if not exists position int not null default 0;

-- Give any pre-existing rows a stable order rather than leaving them all at 0,
-- which would make the habit list shuffle between reads.
update public.rules r
   set position = ordered.rn
  from (
    select id, (row_number() over (partition by user_id order by created_at, id) - 1) as rn
      from public.rules
  ) ordered
 where r.id = ordered.id
   and r.position = 0;

create index if not exists rules_user_id_idx on public.rules(user_id);

-- --------------------------------------------------------------------------
-- daily_logs
-- --------------------------------------------------------------------------

alter table public.daily_logs
  add column if not exists updated_at timestamptz not null default now();

create index if not exists daily_logs_user_id_idx on public.daily_logs(user_id);
create index if not exists daily_logs_feed_idx on public.daily_logs(created_at desc)
  where status in ('completed', 'shielded');

-- One log per participant per day. `saveDailyLog` upserts on this pair, so
-- without the constraint a re-submitted day stacks duplicates instead of
-- updating in place.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.daily_logs'::regclass
       and contype = 'u'
       and conkey = array(
         select attnum from pg_attribute
          where attrelid = 'public.daily_logs'::regclass
            and attname in ('user_id', 'log_date')
          order by attnum
       )
  ) then
    alter table public.daily_logs
      add constraint daily_logs_user_id_log_date_key unique (user_id, log_date);
  end if;
end $$;

-- --------------------------------------------------------------------------
-- reactions — multi-tap needs the same guarantee
-- --------------------------------------------------------------------------

create index if not exists reactions_log_id_idx on public.reactions(log_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.reactions'::regclass
       and contype = 'u'
       and conkey = array(
         select attnum from pg_attribute
          where attrelid = 'public.reactions'::regclass
            and attname in ('log_id', 'sender_id', 'reaction_type')
          order by attnum
       )
  ) then
    alter table public.reactions
      add constraint reactions_log_sender_type_key unique (log_id, sender_id, reaction_type);
  end if;
end $$;
