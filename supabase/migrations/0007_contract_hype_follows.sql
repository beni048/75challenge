-- 0007 — CONTRACT: remove what 0006 made unused.
--
-- ############################################################################
-- ##  DO NOT RUN THIS YET. It is DESTRUCTIVE and IRREVERSIBLE.              ##
-- ##                                                                        ##
-- ##  The application code is COMPLETE without this file. This is cleanup,  ##
-- ##  not unfinished work. 0006 deliberately left the old columns in place  ##
-- ##  so that redeploying the PREVIOUS app version still works — that is    ##
-- ##  the rollback window (supabase.md §1). Running this closes it forever. ##
-- ##  Unused columns cost nothing; losing the escape hatch does.            ##
-- ############################################################################
--
-- WHEN IT IS SAFE:
--   1. 0006 applied to production. ✅ (done)
--   2. The hype + commitment-tier release live in production for a full
--      release cycle with no rollback.
--   3. A fresh backup taken / PITR confirmed to cover this moment.
--   4. The per-section preconditions below satisfied.
--
-- Sections 1 and 2 are independent. Section 1 is ready once the release has
-- settled. Section 2 is BLOCKED on a code change and must not be run before
-- it — see its own header.

begin;

-- ===========================================================================
-- SECTION 1 — safe once the release has settled.
--
-- Verified: nothing in src/ reads or writes reaction_type, reaction_count, or
-- user_follows. Re-confirm before running:
--     grep -rn "reaction_type\|reaction_count\|user_follows" src/
-- Only src/lib/db/types.ts should appear, and only if the row types have not
-- yet been trimmed.
-- ===========================================================================

-- Guard: if any reaction lacks a phrase, 0006's data migration did not
-- complete and dropping the old column would lose that reaction entirely.
do $$
begin
  if exists (select 1 from public.reactions where phrase_id is null) then
    raise exception
      'Aborting: reactions with a null phrase_id exist. 0006 did not complete — do not contract.';
  end if;
end $$;

alter table public.reactions
  drop column if exists reaction_type,
  drop column if exists reaction_count;

-- The 0006 rollback snapshot. Dropping it is the point of no return for the
-- reaction dedupe, so it goes last in this section.
drop table if exists public.reactions_backup_0006;

-- Superseded entirely by user_unfollows; the feed never read it.
drop table if exists public.user_follows;

commit;

-- ===========================================================================
-- SECTION 2 — users.shields_remaining. DO NOT RUN THIS YET.
--
-- ⚠️  BLOCKED ON A CODE CHANGE. Unlike section 1, this column is STILL
--     WRITTEN by the current application:
--
--       src/lib/db/profile.ts:39   assemble()          reads  it
--       src/lib/db/profile.ts:261  createChallenge()   writes it
--       src/lib/db/profile.ts:470  spendShield()       writes it
--       src/lib/db/profile.ts:508  restartChallenge()  writes it
--
--     Shield availability is already DERIVED from commitment_level +
--     last_shield_used_at (src/lib/shield-policy.ts) — nothing depends on
--     this column's VALUE any more — but the writes would fail against a
--     dropped column and break signup, shield-spend and reset.
--
-- BEFORE RUNNING, in this order:
--   1. Remove the four references above, plus Challenge.shieldsRemaining in
--      src/lib/db/types.ts and UserChallengeProfile.shields_remaining in
--      src/lib/streak-engine.ts.
--   2. Ship that, and let it settle in production.
--   3. Confirm `grep -rn "shields_remaining" src/` is empty.
--   4. Only then uncomment and run:
--
--        begin;
--        alter table public.users drop column if exists shields_remaining;
--        commit;
-- ===========================================================================
