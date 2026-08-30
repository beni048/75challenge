-- 0005 — Storage quota measurement and rolling-window photo cleanup.
--
-- Apply after 0004. Safe to re-run: everything is `if not exists` or
-- `create or replace`, no rows are read or written, and the whole file runs in
-- one transaction. It creates NO data and deletes NO data — it only adds the
-- functions the cleanup route calls.
--
-- WHY: Supabase's free tier caps Storage at 1 GB, shared by every participant.
-- Without a ceiling guard, the bucket eventually fills and *every* subsequent
-- proof-photo upload fails — which would break check-ins for everyone at once.
-- This migration provides the measurement and selection primitives; the
-- deletion itself runs from src/app/api/cleanup-storage/route.ts, which holds
-- the service-role key.
--
-- TWO RULES THAT MUST NOT BE BROKEN:
--
-- 1. NEVER `delete from storage.objects` directly. There is no cascade to the
--    underlying S3 object, so a direct row delete leaks the file *and* destroys
--    the metadata that would let anything find it again — the space becomes
--    permanently unreclaimable. All object deletion goes through the Storage
--    API (`supabase.storage.from(b).remove([...])`) in the route handler.
--
-- 2. Every function here runs `set search_path = ''` and fully qualifies its
--    tables. The older helpers (participant_count, consume_rules_change) use
--    `set search_path = public` because they never leave that schema; these
--    read `storage.objects`, so they cannot.

begin;

-- An equality-joinable object path, so the reconciliation queries below do not
-- degrade into a `like '%...'` scan over every log.
create index if not exists daily_logs_photo_object_path_idx
  on public.daily_logs ((substring(photo_url from '/proof-photos/(.+)$')))
  where photo_url is not null;

-- ---------------------------------------------------------------------------
-- Measurement
--
-- Counts BOTH buckets: the threshold should reflect honest total project
-- usage. Only proof-photos is ever a deletion candidate (see below) — avatars
-- are bounded by construction at one object per user and are never cleaned.
--
-- `metadata->>'size'` is null on folder placeholders, hence the coalesce.
-- ---------------------------------------------------------------------------
create or replace function public.storage_usage_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(coalesce((o.metadata->>'size')::bigint, 0)), 0)::bigint
    from storage.objects o
   where o.bucket_id in ('proof-photos', 'avatars');
$$;

-- `create function` grants EXECUTE to PUBLIC by default, so revoke explicitly.
revoke execute on function public.storage_usage_bytes() from public;
grant execute on function public.storage_usage_bytes() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Pass 1: orphans — objects no live row references.
--
-- Reclaiming these costs nothing user-visible, so the route always runs this
-- pass before touching a single live photo. Orphans arise from a crash between
-- "clear the column" and "delete the object", and from an avatar uploaded
-- during a signup that then failed.
-- ---------------------------------------------------------------------------
create or replace function public.storage_orphan_objects(batch_size int)
returns table (object_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'proof-photos'
     and not exists (
       select 1
         from public.daily_logs l
        where l.photo_url is not null
          and substring(l.photo_url from '/proof-photos/(.+)$') = o.name
     )
   order by o.created_at asc
   limit greatest(coalesce(batch_size, 0), 0);
$$;

revoke execute on function public.storage_orphan_objects(int) from public;
grant execute on function public.storage_orphan_objects(int) to service_role;

-- ---------------------------------------------------------------------------
-- Pass 2: live photos.
--
-- Ordering is the retention POLICY, and it deliberately lives here — versioned
-- in a migration — rather than in TypeScript. Plain "oldest first" would take
-- the early days off the people furthest into their challenge, i.e. punish the
-- most committed participants to make room for new signups. So abandoned
-- attempts (`users.status = 'failed'`) are given up first; only then does it
-- fall back to oldest-first across everyone.
-- ---------------------------------------------------------------------------
create or replace function public.storage_cleanup_candidates(batch_size int)
returns table (log_id uuid, object_path text, size_bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id,
         substring(l.photo_url from '/proof-photos/(.+)$'),
         coalesce((o.metadata->>'size')::bigint, 0)
    from public.daily_logs l
    join public.users u on u.id = l.user_id
    left join storage.objects o
           on o.bucket_id = 'proof-photos'
          and o.name = substring(l.photo_url from '/proof-photos/(.+)$')
   where l.photo_url is not null
     and substring(l.photo_url from '/proof-photos/(.+)$') is not null
   order by (u.status = 'failed') desc, l.log_date asc, l.id asc
   limit greatest(coalesce(batch_size, 0), 0);
$$;

revoke execute on function public.storage_cleanup_candidates(int) from public;
grant execute on function public.storage_cleanup_candidates(int) to service_role;

-- ---------------------------------------------------------------------------
-- Clear the column and hand the paths back in the SAME statement, so the
-- caller still holds them once the row no longer does.
--
-- This is what makes DB-first ordering safe: if the Storage delete then fails,
-- the object is merely orphaned, and storage_orphan_objects() reclaims it on
-- the next run. The reverse order (delete first) would leave a live row
-- pointing at a 404 — a broken image on other people's feeds.
--
-- The day itself is untouched: status stays 'completed', only the photo goes
-- (start.md §4 — a completed day is final).
-- ---------------------------------------------------------------------------
create or replace function public.storage_release_photos(log_ids uuid[])
returns table (log_id uuid, object_path text)
language sql
volatile
security definer
set search_path = ''
as $$
  with victims as (
    select id, substring(photo_url from '/proof-photos/(.+)$') as object_path
      from public.daily_logs
     where id = any(log_ids)
       and photo_url is not null
     for update
  ),
  cleared as (
    update public.daily_logs l
       set photo_url = null, updated_at = now()
      from victims v
     where l.id = v.id
    returning l.id
  )
  select v.id, v.object_path from victims v join cleared c on c.id = v.id;
$$;

revoke execute on function public.storage_release_photos(uuid[]) from public;
grant execute on function public.storage_release_photos(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Cooldown + mutex, as a single atomic claim.
--
-- Under READ COMMITTED a concurrent second claim blocks on this row's lock,
-- then re-evaluates the predicate against the UPDATED row, sees
-- last_run_at = now(), and returns zero rows. That is a correct distributed
-- mutex and a cooldown in one statement — which is what stops two concurrent
-- serverless invocations from racing on the same batch.
--
-- This is the AUTHORITATIVE rate limit. The localStorage check on the client
-- is advisory only: in this threat model the client is the attacker.
-- ---------------------------------------------------------------------------
create table if not exists public.storage_cleanup_state (
  id boolean primary key default true check (id),
  last_run_at timestamptz not null default 'epoch',
  last_run_deleted int not null default 0,
  last_run_freed_bytes bigint not null default 0
);

insert into public.storage_cleanup_state (id) values (true) on conflict do nothing;

-- RLS enabled with NO policies: nothing but service_role (which bypasses RLS)
-- can read or write this table.
alter table public.storage_cleanup_state enable row level security;

create or replace function public.claim_storage_cleanup(cooldown_seconds int)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  update public.storage_cleanup_state
     set last_run_at = now()
   where id
     and last_run_at < now() - make_interval(secs => greatest(coalesce(cooldown_seconds, 0), 0))
  returning true;
$$;

revoke execute on function public.claim_storage_cleanup(int) from public;
grant execute on function public.claim_storage_cleanup(int) to service_role;

-- Records the outcome so a later run (or a human) can see what happened.
create or replace function public.record_storage_cleanup(deleted int, freed_bytes bigint)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.storage_cleanup_state
     set last_run_deleted = coalesce(deleted, 0),
         last_run_freed_bytes = coalesce(freed_bytes, 0)
   where id;
$$;

revoke execute on function public.record_storage_cleanup(int, bigint) from public;
grant execute on function public.record_storage_cleanup(int, bigint) to service_role;

commit;
