-- 0007 — CONTRACT: remove what 0006 made unused.
--
-- ############################################################################
-- ##  DO NOT RUN THIS IN THE SAME RELEASE AS 0006.                          ##
-- ##                                                                        ##
-- ##  This file is DESTRUCTIVE and IRREVERSIBLE. It exists so the cleanup   ##
-- ##  is written down and versioned — not so it runs today.                 ##
-- ############################################################################
--
-- supabase.md §1: Expand and Contract are separate releases on purpose. The
-- gap between them is the rollback window. While 0006 is applied and 0007 is
-- not, the previous app version still runs against this database. Once 0007
-- has run, that door is shut.
--
-- RUN THIS ONLY WHEN ALL OF THESE ARE TRUE:
--   1. 0006 has been applied to production.
--   2. The hype + commitment-tier release has been live in production for at
--      least one full release cycle with no rollback.
--   3. This returns 0 — nothing is still writing the old columns:
--        select count(*) from public.reactions
--         where reaction_type is not null or reaction_count is not null;
--      (rows created BEFORE 0006 keep their old values, so a non-zero result
--       here is expected right after 0006 and is not itself a blocker — what
--       matters is that no NEW rows have them. Check the newest row:
--        select reaction_type, reaction_count, created_at from public.reactions
--         order by created_at desc limit 1;)
--   4. `grep -rn "reaction_type\|reaction_count\|user_follows" src/` is empty.
--   5. You have taken a fresh backup / confirmed PITR covers this moment.
--
-- WHAT IT REMOVES PERMANENTLY:
--   - public.reactions.reaction_type, public.reactions.reaction_count
--   - public.reactions_backup_0006   (the 0006 rollback snapshot)
--   - public.user_follows            (replaced by user_unfollows entirely)
--   - public.users.shields_remaining (replaced by shield-policy.ts derivation)
--
-- Count before and after; only `reactions` column-count changes, no row counts:
--   select (select count(*) from public.users)      as users,
--          (select count(*) from public.daily_logs) as logs,
--          (select count(*) from public.reactions)  as reactions;

begin;

-- Guard: refuse to run if the app never populated phrase_id, which would mean
-- 0006's migration path did not actually complete.
do $$
begin
  if exists (select 1 from public.reactions where phrase_id is null) then
    raise exception
      'Aborting: some reactions still have a null phrase_id. 0006 did not complete — do not contract.';
  end if;
end $$;

alter table public.reactions
  drop column if exists reaction_type,
  drop column if exists reaction_count;

drop table if exists public.reactions_backup_0006;

drop table if exists public.user_follows;

alter table public.users
  drop column if exists shields_remaining;

commit;
