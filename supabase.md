# 🗄️ Supabase & SQL — Rules & Best Practices

> **Read this before writing any migration, RLS policy, or database helper.**
> Companion to [`github.md`](./github.md) (branching/deploys) and
> [`testing.md`](./testing.md) (the pre-push gate). Where this file and
> `start.md` disagree, `start.md` wins.

---

## 0. The two rules that override everything

### 🔒 Rule 1 — A migration must never destroy user data

There are real people with real streaks in this database. A lost `daily_logs`
row is a lost day of someone's life that they cannot get back.

**No migration may contain a destructive statement in the same file that
introduces the feature needing it.** Destructive means: `drop table`,
`drop column`, `delete from`, `truncate`, `alter column … type` (which rewrites),
or `drop constraint` on something still enforcing correctness.

### 🧭 Rule 2 — Existing users must get a path onto every new feature

A schema change that adds a choice, a field, or a mode is only half done when
new signups can use it. Every existing account must:

1. **Be backfilled with a value that preserves their current behaviour exactly.**
   Never leave an existing user in a state that changes what they experience.
2. **Be offered the new thing explicitly**, via the announcement mechanism in
   §5 — because a user who was silently defaulted never actually *chose*.

A migration that adds a user-facing column without doing both is incomplete.

---

## 1. Expand / Contract — the only safe way to change a column

Never add-and-remove in one step. Split every breaking change across **two
migrations, deployed at different times**:

| Phase | Migration | Contains | When |
|---|---|---|---|
| **Expand** | `000N` | Add new column/table. Backfill it. Relax old constraints (`drop not null`). Keep the old column. | Ship with the feature |
| **Migrate** | — | Deploy code that writes the new column and stops reading the old one. Verify in production. | Same release |
| **Contract** | `000N+1` | `drop column` / `drop table` on the now-unused old thing. | **A later release**, only once the app has run clean on the new shape |

The gap between Expand and Contract is what makes a rollback possible. If the
new code is broken, you redeploy the old code and the old column is still
there. Once you have contracted, that door is shut.

**Never run a Contract migration in the same session as its Expand.**

---

## 2. Every migration file must

- **Be wrapped in `begin; … commit;`** so a failure part-way rolls the whole
  thing back rather than leaving the schema half-changed.
- **Be re-runnable.** `add column if not exists`, `create table if not exists`,
  `create or replace function`, `insert … on conflict do nothing`, and
  `drop policy if exists` immediately before each `create policy`.
- **State in a header comment**: what it does, whether it is destructive, and
  whether it has already been applied to dev/production.
- **Carry a verification query** in a trailing comment — one that returns
  **zero rows when the schema is correct**. Checking columns, not just tables:
  a `create table if not exists` silently skips a table that exists in an older
  shape, which is exactly how this project once shipped a database missing
  `users.updated_at` while looking fully migrated.

### Before/after proof for anything touching rows

Run this immediately before and immediately after, and compare:

```sql
select (select count(*) from public.users)          as users,
       (select count(*) from public.rules)          as rules,
       (select count(*) from public.daily_logs)     as logs,
       (select count(*) from public.reactions)      as reactions,
       (select count(*) from public.user_unfollows) as unfollows;
```

Any number that drops unexpectedly means stop and restore.

---

## 3. When a destructive step is genuinely unavoidable

Sometimes there is no way forward without removing rows — e.g. adding a
`unique` constraint to data that contains duplicates. In that case:

1. **Snapshot the whole table first, in the same transaction:**
   ```sql
   create table if not exists public.reactions_backup_0006 as
     select * from public.reactions;
   ```
   This is cheap, it is inside the transaction, and it turns an irreversible
   delete into a recoverable one.
2. **Delete only what you must**, and `raise notice` how many rows went.
3. **Keep the backup table** until the Contract migration drops it, a release
   later. It is the rollback.
4. **Say so loudly** in the file header and in the deploy notes.

---

## 4. Order of operations for a release

Schema is always ahead of code, never behind:

1. Apply the **Expand** migration to **dev**.
2. Verify with the migration's own verification query + the count query.
3. Deploy the code to dev, exercise it by hand on `dev.75challenge.quest`.
4. Promote code to `main` (see `github.md`).
5. Apply the same migration to **production**, then deploy.
6. **Later release**: apply Contract.

Because Expand is additive, step 5 is safe to run while the old code is still
live — that is the whole point.

**Production and dev must run the same numbered migrations in the same order.**
If you are unsure whether one was applied, run its verification query. Never
guess: a later migration can apply cleanly against a database missing an
earlier one, so "it ran without error" proves nothing.

---

## 5. Announcing a change to existing users

`public.users.acknowledged_updates text[]` holds the keys of changes an account
has already seen. The flow:

1. The migration backfills a behaviour-preserving default (e.g.
   `commitment_level = 'classic'`, which is exactly what every pre-existing
   account already had).
2. A `FeatureAnnouncement` banner renders for accounts whose
   `acknowledged_updates` lacks the feature's key.
3. Acting on it (or dismissing) appends the key via `acknowledgeUpdate()`, so
   it never shows again — **on any device**, which is why this lives in the
   database rather than `localStorage`.

Keys are versioned strings: `'commitment-level-v1'`. Never reuse or renumber
one; they are stored in user rows.

Use this for anything that changes what a user sees or can choose. Do **not**
use it for silent internal changes — an announcement the user cannot act on is
just noise.

---

## 6. RLS is the entire authorization model

The browser only ever holds the anon key, so there is no trusted server layer
in front of the database (except the two service-role API routes).

- **Every table gets `enable row level security`** plus explicit policies. A
  table with RLS on and no policies is readable by nobody but `service_role` —
  which is a legitimate and useful state (see `storage_cleanup_state`).
- **Write policies are always `auth.uid() = <owner column>`.**
- **Think about what a policy reveals by omission.** `user_unfollows` is
  `using (auth.uid() = follower_id)` so nobody can see who hid them — and that
  is why "who follows me" cannot be shown in a follow-everyone-by-default
  model: the complement leaks it.
- **A `check` constraint is not authorization**, but it is how invariants like
  "no self-follow" and "no negative reactions" become unrepresentable rather
  than merely discouraged.

### `security definer` functions

- Always `set search_path = ''` and fully qualify (`public.users`,
  `storage.objects`). A mutable search_path on a definer function is a
  privilege-escalation vector, and Supabase's linter flags it.
- `create function` grants `execute` to `PUBLIC` by default —
  **always `revoke execute … from public`** and then grant to exactly the roles
  that need it.
- `security definer` does **not** bypass RLS by itself; it runs as the owner,
  and RLS is skipped only if that role owns the table or has `BYPASSRLS`.
  Verify empirically rather than assuming, because the failure mode is a
  silently partial result, not an error.

---

## 7. Client-side data access

- All database access goes through `src/lib/db/`. Components never call
  Supabase directly.
- Helpers return `DbResult<T>` (`{data, error}`) and **never throw** — each
  wraps its body in try/catch and returns `fail(error)`.
- **Never `select('*')`** on a table with columns the caller does not need.
- Prefer **keyset pagination** (`.lt('created_at', cursor)`) over `.range()`
  offsets. Offsets skip and repeat rows when data is inserted mid-scroll.
- Watch for **N+1 fan-out**: one RPC per row in a page is the most common
  performance mistake in this codebase.

---

## 8. Storage

Covered in `start.md` §9.1 — the 1 GB budget, compression, and the
rolling-window cleanup. The one rule that belongs here too:

**Never `delete from storage.objects` in SQL.** There is no cascade to the
underlying S3 object, so a direct row delete leaks the file *and* destroys the
metadata that would let anything find it again, making the space permanently
unreclaimable. All object deletion goes through the Storage API.

---

## 9. Checklist before running any migration

- [ ] Wrapped in `begin; … commit;`
- [ ] Re-runnable (`if not exists` / `or replace` / `drop policy if exists`)
- [ ] Header says what it does and whether it is destructive
- [ ] Contains **no** `drop`/`delete`/`truncate` — or, if it must, snapshots first (§3)
- [ ] Every new user-facing column has a behaviour-preserving backfill
- [ ] Every new user-facing choice has an announcement key (§5)
- [ ] New tables have RLS enabled and explicit policies
- [ ] New `security definer` functions: `search_path = ''`, `revoke from public`
- [ ] Verification query included, returns zero rows when correct
- [ ] Count query run before **and** after, on dev first
