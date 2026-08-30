-- 0008 — EXPAND: one claimed hype phrase per post, everyone else agrees.
--
-- Apply after 0006. INDEPENDENT OF 0007 — run this and skip 0007 entirely;
-- 0007 is optional cleanup that has not run and does not need to.
--
-- ORDERING NOTE: this migration BACKFILLS from reactions.phrase_id, which is
-- exactly the column 0007 would drop. So 0008 must run BEFORE 0007, ever. When
-- 0007 is eventually run it should also drop reactions.phrase_id, which this
-- migration makes redundant.
--
-- ============================================================================
-- THIS MIGRATION DOES NOT DROP ANYTHING (supabase.md §1).
-- ============================================================================
-- It adds two columns, backfills them from existing data, and adds one
-- function. reactions.phrase_id is left in place and still written by the app,
-- so redeploying the previous version keeps working.
--
-- WHY: the hype phrase belongs to the POST, not to each reaction. Previously
-- every hyper stored their own sentence and none of them were ever displayed —
-- the recipient saw only "Beni and 2 others". Now the first person to hype
-- claims a sentence for the post and everyone after agrees with it, which is
-- both visible and stays compact whether a post has 2 hypes or 200.
--
-- BEFORE AND AFTER, compare (supabase.md §2). Every count must be IDENTICAL —
-- this migration writes only to two brand-new columns:
--
--   select (select count(*) from public.users)          as users,
--          (select count(*) from public.daily_logs)     as logs,
--          (select count(*) from public.reactions)      as reactions,
--          (select count(*) from public.user_unfollows) as unfollows;

begin;

alter table public.daily_logs
  add column if not exists hype_phrase_id  text,
  add column if not exists hype_claimed_by uuid references public.users(id) on delete set null;

-- A phrase id is a key into src/lib/hype-phrases.ts, never free text.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.daily_logs'::regclass
                    and conname = 'daily_logs_hype_phrase_id_length') then
    alter table public.daily_logs
      add constraint daily_logs_hype_phrase_id_length check (length(hype_phrase_id) <= 64);
  end if;
end $$;

-- Backfill: the earliest existing reaction on each post becomes its claim, so
-- hype sent before this change is preserved and displayed rather than lost.
-- No-op on a database with no reactions yet.
with first_hype as (
  select distinct on (log_id) log_id, sender_id, phrase_id
    from public.reactions
   where phrase_id is not null
   order by log_id, updated_at asc, sender_id asc
)
update public.daily_logs l
   set hype_phrase_id = f.phrase_id,
       hype_claimed_by = f.sender_id
  from first_hype f
 where l.id = f.log_id
   and l.hype_phrase_id is null;

-- ---------------------------------------------------------------------------
-- The atomic claim.
--
-- Two people tapping in the same instant both believe they are first. The
-- `where hype_phrase_id is null` predicate resolves it in the database: the
-- winner gets a row back, the loser gets none and simply becomes an agreer.
-- No advisory locks, no read-then-write race.
--
-- Returns the phrase that ended up on the post either way, so the caller can
-- render the right thing without a second round trip.
-- ---------------------------------------------------------------------------
create or replace function public.claim_hype_phrase(
  target_log_id uuid,
  candidate_phrase_id text,
  claimer uuid
)
returns table (phrase_id text, claimed_by uuid, did_claim boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claimed record;
begin
  update public.daily_logs
     set hype_phrase_id = candidate_phrase_id,
         hype_claimed_by = claimer
   where id = target_log_id
     and hype_phrase_id is null
  returning hype_phrase_id, hype_claimed_by into claimed;

  if found then
    return query select claimed.hype_phrase_id, claimed.hype_claimed_by, true;
  else
    -- Somebody else already claimed it (or we lost the race). Hand back what
    -- is actually on the post so the UI shows the agreed sentence.
    return query
      select l.hype_phrase_id, l.hype_claimed_by, false
        from public.daily_logs l
       where l.id = target_log_id;
  end if;
end $$;

revoke execute on function public.claim_hype_phrase(uuid, text, uuid) from public;
grant execute on function public.claim_hype_phrase(uuid, text, uuid) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICATION — run separately, after the commit. Zero rows means correct.
-- ---------------------------------------------------------------------------
--   select c.col from (values ('hype_phrase_id'), ('hype_claimed_by')) as c(col)
--   where not exists (
--     select 1 from information_schema.columns i
--      where i.table_schema = 'public' and i.table_name = 'daily_logs'
--        and i.column_name = c.col
--   );
--
-- And the backfill covered every post that had hype (must return 0):
--   select count(*) from public.daily_logs l
--    where l.hype_phrase_id is null
--      and exists (select 1 from public.reactions r where r.log_id = l.id);
