-- 75 Challenge — the one-time rule change after day 7
--
-- Apply after 0001 and 0002. Safe to re-run.
-- Depends on `users.updated_at`, which 0002 adds if it is missing.
--
-- Participants commit to their habits up front, but the first week teaches them
-- whether they aimed too high or too low. They get exactly one chance to adjust,
-- available from day 8 onward. `rules_changed_at` records when that chance was
-- spent; NULL means still available.

alter table public.users
  add column if not exists rules_changed_at timestamptz;

comment on column public.users.rules_changed_at is
  'When the participant used their single post-day-7 rule change. NULL = unused.';

-- Enforced in the database as well as the UI, so the window cannot be bypassed
-- by calling the API directly. Runs BEFORE any rules row is written and rejects
-- the write unless the challenge is past day 7 and the allowance is unspent.
--
-- Signup is exempt: the initial rule set is inserted in the same breath as the
-- users row, which is what the created_at grace period below allows for.
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

  -- Grace period: the rule set created during signup lands seconds after the
  -- users row, long before day 7.
  if now() < challenge.created_at + interval '2 minutes' then
    return coalesce(new, old);
  end if;

  if now()::date < challenge.start_date + 7 then
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

drop trigger if exists rules_change_window on public.rules;
create trigger rules_change_window
  before insert or update or delete on public.rules
  for each row execute function public.enforce_rules_change_window();

-- Marks the allowance as spent. Called once by the client after a successful
-- rule edit; `where rules_changed_at is null` makes a double call a no-op.
create or replace function public.consume_rules_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users
     set rules_changed_at = now(),
         updated_at = now()
   where id = auth.uid()
     and rules_changed_at is null;
$$;

grant execute on function public.consume_rules_change() to authenticated;
