# 🏁 75 Challenge — Project Rules & Reference

> **READ THIS FILE BEFORE EVERY WORK SESSION.**
> This is the single source of truth for all product requirements, architecture constraints, and design decisions.
>
> 📱 **MOBILE FIRST IS MANDATORY** — see §12. Every screen is designed for a phone first.
>
> 🐙 **GIT & GITHUB OPERATIONS**: When performing any Git or GitHub work (branching, committing, pull requests), always consult the [GitHub Git Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/github.md) guidelines. This includes the **dev → production promotion rule**: all new work lands on `dev` (deployed to `dev.75challenge.quest`) first; `main` (deployed to `75challenge.quest`) only receives changes that have been tested on dev and explicitly approved by the user. Never push a feature straight to `main`.
>
> 🗄️ **DATABASE & SQL**: Before writing any migration, RLS policy, or `src/lib/db/` helper, read the [Supabase & SQL Rules](file:///home/benjamin/workspace/github.com/beni048/75challenge/supabase.md). Two rules override everything there: **(1) a migration must never destroy user data** — additive Expand first, destructive Contract only in a later release; and **(2) every new feature must give existing users a path onto it** — a behaviour-preserving backfill *plus* an explicit announcement, because a user who was silently defaulted never actually chose.
>
> 🧪 **TESTING & PRE-DEPLOYMENT RULES**: **ALWAYS** run tests (`npm test`) and type-check (`npm run build`) before pushing code or triggering deployments. Always consult the [Testing Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/testing.md) guide before modifying or adding tests.

---

## 0. Supabase Auth — diagnosed and fixed (2026-08-29)

Sign-up used to fail silently. Two independent causes, both now handled:

**1. Password minimum mismatch (the real "user not created").** The UI validated
5 characters; Supabase enforces **6** and rejects anything shorter with
`422 weak_password`. A 5-character password passed our form and was then refused
by the API, so no account was ever created.
→ Fixed: `src/lib/password.ts` holds `PASSWORD_MIN_LENGTH = 6` as the single
source of truth, and every password string carries `{min}` rather than a
hardcoded digit. `src/test/password.test.ts` fails the build if a number is ever
written back into that copy.

**2. Email confirmation.** `mailer_autoconfirm` was off, so `signUp` returned no
session, the user was sent to /login, and logging in failed with
"Email not confirmed".
→ Decision: **auto-confirm is enabled on the dev project** so sign-up lands
straight on Day 1. Production keeps confirmation on once real SMTP is
configured. The confirmation path still works (`needsEmailConfirmation` →
`75_pending_signup` → `ChallengeProvider` creates the challenge on first
authenticated visit).

### Rules for auth work
- **Never hardcode the password length in a sentence.** Use `PASSWORD_MIN_LENGTH`
  and interpolate `{min}`. This is exactly how the bug happened.
- **Never show a raw Supabase error.** They are English-only. Map `error_code` to
  a translation key in `src/lib/auth.ts` (`toErrorKey`) so failures are bilingual.
- If sign-up misbehaves again, check in this order: the password minimum in the
  Supabase dashboard, `mailer_autoconfirm`, the allow-listed redirect URLs, and
  that `NEXT_PUBLIC_SUPABASE_URL` is a bare origin with no `/rest/v1` suffix.

### Still unverified against a live project
Email-confirmation sign-up, proof-photo upload to the `proof-photos` bucket, and
`participant_count()`. Treat as unproven until exercised on `dev.75challenge.quest`.

---

## 1. Tech Stack & Infrastructure Constraints

| Layer | Technology | Tier |
|---|---|---|
| Framework | Next.js (App Router) | — |
| Language | TypeScript | — |
| Styling | Vanilla CSS (NO Tailwind) | — |
| Auth & DB | Supabase (PostgreSQL, Auth, Realtime, Storage) | Free |
| Hosting | Vercel | Free |
| Animations | Framer Motion + canvas-confetti | — |
| Image Compression | Client-side Canvas API → WebP (see §9.1) | — |

### Hard Constraints
- **Supabase Storage limit**: 1 GB — client-side image compression is mandatory.
- **Vercel Free Tier**: Serverless functions only, no persistent backend.
- **No Tailwind CSS**: Use vanilla CSS with a custom design system.
- **No SSR secrets leaking**: All Supabase keys via `NEXT_PUBLIC_` env vars for the anon key; service role key server-side only.

---

## 2. Authentication & Sessions

### Auth Strategy
- **Method**: Email + Password (simple registration).
- **Password Policy**: Minimum **6 characters** — this is what Supabase enforces server-side. Defined once in `src/lib/password.ts`; never write the number into copy (§0). No forced uppercase, numbers, or symbols.
- **Session Persistence**: Supabase SSR with persistent HTTP-only refresh tokens. Users stay logged in across daily sessions without re-authenticating.

### Sign-Up Flow ("Join the 75 Challenge")
Required fields:
1. **Display Name** (real name or pseudonym)
2. **Email** + **Password** (min 6 chars)
3. **Habits** — between 3 and 11
4. **Start Date** — previewed with the calculated finish date. Finishing after the shared deadline shows an informational notice but never blocks joining.

### Onboarding is four sequential steps
`OnboardingModal` walks through one decision per screen — this matters most on a
phone, where combining them would mean scrolling past things people skip:

1. **How it works** — the five mechanics, ending in a "Let's go" button
2. **Start date** — on its own screen, with the calculated finish date
3. **Habits** — on its own screen, editable in place
4. **Account** — display name, email, password

Never merge the start date and habit steps back together.

### Log In & Password Reset
- A **Log In** button sits next to **Join 75 Challenge** in the header for signed-out visitors.
- **Password reset** is email-verified: `/login` → "Forgot your password?" sends a Supabase reset link, which lands on `/reset-password` where the user chooses a new password.
- Signed-in users change their password from `/account` (Password tab); if no auth session exists on the device, the UI falls back to the email reset link.

### Fresh Accounts Start Empty
- A newly created account **always starts on Day 1 with zero logged days**. Never seed a new challenge with pre-filled or demo check-ins.
- `current_day` is **derived from `start_date`**, never stored as a mutable counter — the column does not exist in the database.

### Where Data Lives
- **Supabase Auth** owns credentials. The auth user's `id` **is** the challenge's primary key (`public.users.id`), so there is never a lookup step.
- **Supabase Postgres** owns the challenge: rules, daily logs, reactions, unfollows. This is the single source of truth, which is what lets a participant log in on any device and find their streak.
- **`localStorage`** holds only two things: per-device preferences (theme, locale) and a short-lived `75_pending_signup` payload that survives an email-confirmation round trip. It is never the source of truth for challenge data.
- All database access goes through `src/lib/db/`. Components never call Supabase directly.

### Squad Referral Links
- URL pattern: `/join?ref=username`
- Registering via referral auto-connects users and sets `referred_by_id`.

---

## 3. Flexible Rule Engine

### Defaults (75 Hard Standard)
Pre-loaded rules:
- 2 × 45-min workouts (one must be outdoors)
- Drink 4L water
- Read 10 pages of non-fiction
- Follow a clean diet
- No alcohol

### Customization Rules
- Users **can** edit, add, or delete habits. **Titles are editable in place** —
  never make someone delete a suggested habit in order to type their own.
- **Between 3 and 11 habits.** Defined in `src/lib/rules-policy.ts`
  (`MIN_RULES` / `MAX_RULES`); never hardcode the numbers.
- The customizer **recommends spreading habits across areas** — something
  physical, something dietary, something you learn — and encourages habits that
  are genuinely challenging.
- **One change after day 7.** Habits are locked for the first week; from day 8
  the participant gets exactly one adjustment. Enforced in the UI
  (`src/lib/rules-window.ts`) *and* in the database (a trigger in
  `0002_rules_change_window.sql`), so it cannot be bypassed via the API.
- **Editing habits must never destroy history.** `replaceRules` diffs rather
  than deleting and re-inserting: `log_rule_checks.rule_id` cascades on delete,
  so a wholesale replace would wipe the per-rule check marks on every past day.
- **Schedule Types** per rule:
  - `daily` — 7 days a week
  - `workdays` — Mon–Fri only
  - `custom` — user picks specific days (e.g., Mon/Wed/Fri)

---

## 4. Asynchronous Progress & Streak Shield System

### Self-Paced Trust & Check-Ins
- Users check off their own daily progress asynchronously. We trust participants to manage their habits — there is no monitoring, no verification, and no artificial cutoff hour of any kind (no midnight lockout, no 3 AM rollover). A check-in belongs to whatever calendar date the user says it does.

### Completed Days Are Locked
- Once a day is submitted as completed it is **final**. The profile replaces the check-in form with a "day locked in — come back tomorrow" card (`DayLockedCard`).
- A day cannot be reopened, edited, or un-completed. The model runs on self-reported trust; letting people rewrite a finished day would turn the streak into a draft.
- The same lock applies to a day recorded as `shielded`, and to a rest day where no rule is scheduled.

### Self-Reported Failure & Streak Shield Mechanic
- Each user receives exactly **1 Streak Shield** per 75-day attempt.
- The shield/reset prompt (`ShieldModal`) only ever appears when the user **willingly** reports a day as missed — never automatically, never on a schedule.
- When that happens:
  - **Prompt**: "Use your Streak Shield" **OR** "Start over from Day 1" (with a plain-language warning that this wipes the current streak and every logged day).
  - The user may also back out and keep their streak — closing the modal changes nothing.
  - If the shield is deployed → day is recorded as `shielded`, progress continues, 0 shields remain.
  - If a subsequent failure is reported with 0 shields remaining → the only option offered is reset to Day 1.

---

## 5. Social Feed, Privacy & Cold-Start Logic

### Authenticated Stream
- Feed requires login. Users see activity from **all** network participants by default.

### Unfollow Control
- "Unfollow" toggle next to any user hides their posts from the current user's feed.
- Stored in `user_unfollows` table.

### Strava-Style Feed Stream
Each feed post displays:
- User name
- Current progress (e.g., "Day 14 of 75")
- Checked-off rules for the day
- Optional photo
- Time elapsed

### Feed Header Counters
- The bar above the feed shows exactly two counters: **Active Today** and **Total Challengers**.
- Counters are derived from real data on screen — never invented percentages or vanity metrics.
- No "Positive-Only Hype" badge on the feed; the guarantee is explained on the landing page instead.

### Sample Preview Posts
- Curated preview posts are appended **only while nobody has checked in today**. The moment one real participant posts for the day, the samples disappear — sample content sitting next to genuine activity makes the feed feel fake.
- When previews are showing, the feed says so explicitly (`feed.previewNotice`). Never present sample content as though it were real activity.
- Preview posts are not database rows; reactions on them are no-ops.

---

## 6. User Profiles & Public Visibility

### Profile Route: `/user/[username]`
Accessible to all logged-in users. Displays:
- Current day counter (e.g., "Day 32 of 75")
- Active Streak Shield status (Available vs. Used)
- Configured rules and schedules
- Interactive **75-day completion calendar grid** with daily completion checkmarks and uploaded photos

---

## 7. Positive-Only Hype Engine

### Strict Guardrails
- ❌ **No text comments** allowed.
- ❌ **No downvotes** or negative reactions.

### Reaction Buttons
Multi-tap reaction buttons with animations:
| Emoji | Name |
|---|---|
| 🔥 | Fire |
| 💪 | Beast |
| 🚀 | Launch |
| 🙌 | Hype |

- **Framer Motion** micro-animations on tap.
- **canvas-confetti** burst on milestone reactions.
- **Optimistic UI updates** — show reaction immediately, sync to DB in background.

---

## 8. Landing Page & Onboarding

### Landing Page (`/`)
`/` serves two audiences:
- **Signed out**, in this order: **hero → how it works → feed preview → closing CTA**. This reverses an earlier deliberate choice (feed preview above the explanation, on the theory that seeing real people mid-challenge is more persuasive than being told the rules first) — a later, explicit product decision put the explanation first instead. The preview is illustrative only: nothing in it is clickable.
- **Signed in** — the community feed *is* the landing page. There is no separate "Community Feed" nav link.

### Header
- Signed out: language switch, theme toggle, **Log In**, **Join 75 Challenge**.
- Signed in: language switch, theme toggle, **account avatar menu** (My Challenge / Edit Rules / Password & Security / Log Out).

### Sample Media
- Feed preview posts carry generated sample images from `public/samples/` so visitors see what a real post looks like. Per §11 these are generated assets, not grey placeholder boxes.

---

## 9. Database Schema

> **Source of truth: the files in `supabase/migrations/`, applied in order.**
>
> **Run 0001 → 0002 → 0003.** `0001` creates the tables, RLS, storage and
> functions. `0002` reconciles a database whose tables predate 0001 — the
> `create table if not exists` guard in 0001 skips creation but NOT the rest of
> the file, so a schema can look applied while missing `users.updated_at`,
> `rules.position` and `daily_logs.updated_at`. That state breaks every write
> path. `0003` adds the one-time rule change window.
>
> **Verifying an apply is not "do the tables exist" — it is "do the columns
> exist".** Run this in the Supabase SQL editor; zero rows means the schema has
> everything the app needs:
>
> ```sql
> select c.tbl, c.col
> from (values
>   ('users','updated_at'), ('users','rules_changed_at'),
>   ('rules','position'),   ('daily_logs','updated_at')
> ) as c(tbl, col)
> where not exists (
>   select 1 from information_schema.columns i
>   where i.table_schema = 'public'
>     and i.table_name = c.tbl
>     and i.column_name = c.col
> );
> ```
>
> And `current_day` must be gone — this must return 0:
>
> ```sql
> select count(*) from information_schema.columns
>  where table_schema = 'public' and table_name = 'users'
>    and column_name = 'current_day';
> ```
>
> Apply to dev first, then production (github.md §4). The table below is
> orientation only — if it disagrees with the migrations, the migrations win.

| Table | Holds | Notes |
|---|---|---|
| `users` | One row per participant | PK **is** `auth.users.id`. No `current_day` column — it is derived from `start_date`. |
| `rules` | A participant's rule set | `position` preserves their ordering. Replaced wholesale on edit. |
| `daily_logs` | One row per participant per day | `unique (user_id, log_date)`. Statuses: `completed`, `shielded`, `failed`. |
| `log_rule_checks` | Which rules were ticked on a given day | Cascades from the log and the rule. |
| `reactions` | Multi-tap hype counts | `unique (log_id, sender_id, reaction_type)`; type is constrained to the four positive reactions, so a downvote is unrepresentable. |
| `user_unfollows` | Per-viewer feed hiding | Private to the follower. |

### Row Level Security
RLS is the **entire** authorization model — the browser only ever holds the anon
key, so there is no trusted server layer in front of it. Key policies:

- Nothing is readable by anonymous visitors: the feed requires login.
- `daily_logs` select is `status in ('completed','shielded') or auth.uid() = user_id`. Other people's failed days are unreachable, enforcing the positive-only guarantee in the database rather than only in the client.
- Every write policy is `auth.uid() = <owner column>`.
- Storage objects live under `<user-id>/…`; the policy checks that first path segment.

### Storage
Two buckets, both public read, both writing under `<user-id>/…` so the RLS
policy can check that first path segment:

| Bucket | Holds | Lifecycle |
|---|---|---|
| `proof-photos` | One object per check-in, `<user-id>/<uuid>.<ext>` | Never overwritten; **eligible for automatic cleanup** (§9.1) |
| `avatars` | One object per user, `<user-id>/avatar.webp`, `upsert: true` | Replaced on change; **never cleaned** — bounded at one per user |

**Only the durable Storage URL is ever persisted on a log** — a `blob:` preview
URL dies with the page and renders broken after a reload.

---

## 9.1 The Storage Budget — MANDATORY

> The free tier gives **1 GB of Storage, shared by every participant**. If it
> fills, *every* proof-photo upload fails at once — check-ins break for the
> whole community, not just the person who tipped it over. Everything in this
> section exists to make that unreachable.

### The numbers live in code, never in prose
All of them are in **`src/lib/image-compressor.ts`** (dimensions, quality,
target KB) and **`src/lib/storage-quota.ts`** (quota, thresholds, batch sizes).
Never write a KB or px figure into a comment, a doc, or a UI string — import
the constant. This section deliberately names no numbers for that reason; it
is exactly how the 5-vs-6 password bug shipped (§0).

### Every image is compressed before upload
Downscaled and re-encoded client-side via the Canvas API, then uploaded. This
is a silent preprocessing step — the participant sees a brief "compressing"
label and nothing else.

- **Proof photos** and **avatars** have separate budgets; pass the `AVATAR_*`
  constants explicitly rather than relying on the proof-photo defaults.
- **WebP is requested, but not guaranteed.** `canvas.toBlob(cb, 'image/webp')`
  is specified to fall back to **PNG** where WebP is unsupported — silently,
  and ignoring `quality` entirely, since PNG is lossless. That produced a
  1.26 MB "compressed" file in the dev bucket under a `.webp` name. So:
  `encodeCanvas` checks `blob.type` and falls back to **JPEG** (universally
  supported, and it *does* honour quality). Upload paths take the extension
  and content type **from `blob.type`**, never from an assumption.
- **The size cap is enforced, not hoped for.** If the quality floor is reached
  and the result is still over the hard ceiling, compression **throws** rather
  than uploading. A bound you don't enforce is not a bound — and "≤ 75 photos
  per user" only holds if each one is actually capped.
- Compression applies to **new uploads only**. Nothing ever re-encodes what is
  already in the bucket.

### Old photos are reclaimed automatically ("rolling window")
Once usage crosses the trigger ratio, `POST /api/cleanup-storage` frees space
back down to the target ratio. The gap between the two is **hysteresis and is
not optional** — with a single threshold, every upload past the line would
start another run that frees just enough to dip under it and immediately cross
back.

**A cleaned day stays completed.** Only `photo_url` is set to `null`; status,
rule checks, streak and shield maths are untouched (§4 — a completed day is
final). `photo_url IS NULL` is already a normal state — `catchUpDays` writes it
deliberately, and `FeedCard` renders no photo block for it.

**Order is DB-first, then Storage**, and this is not interchangeable:
- Clearing the column first puts the row into a state the app already handles.
  If the Storage delete then fails, the object is merely *orphaned*, and the
  next run's orphan pass reclaims it for free.
- The reverse would leave a live row pointing at a 404 — a broken image on
  other people's feeds. (`FeedCard` also has an `onError` fallback for this,
  but not creating the bug beats handling it.)

**Retention order is a product decision, and it lives in SQL** (migration
`0005`), not in TypeScript, so it is versioned: **abandoned attempts
(`users.status = 'failed'`) are given up first**, and only then oldest-first
across everyone. Plain "delete oldest" would strip the early days from the
people furthest into their challenge — punishing the most committed
participants to make room for new signups.

**Never `delete from storage.objects` in SQL.** There is no cascade to the
underlying S3 object: a direct row delete leaks the file *and* destroys the
metadata that would let anything find it again, making the space permanently
unreclaimable. All deletion goes through the Storage API in the route handler.

### The cleanup endpoint is destructive — how it is defended
In priority order. Note the auth check is **not** the most important one:
1. **It accepts no user-controlled target.** No body, no ids, no bucket, no
   count. *What* gets deleted is computed entirely server-side by the SQL
   functions. An attacker cannot aim it.
2. **It is a no-op below the trigger threshold**, so spamming it achieves
   nothing in the normal case.
3. **A server-side atomic claim** (`claim_storage_cleanup`) is the cooldown
   *and* a mutex, so two concurrent invocations cannot race the same batch.
   This is the authoritative rate limit — the `localStorage` throttle on the
   client is advisory only, because in this threat model the client is the
   attacker.
4. **Auth**: the cron bearer secret (compared with `timingSafeEqual`), or a
   valid Supabase session via `getUser()` — **never `getSession()`**, which
   trusts a forgeable cookie instead of revalidating the JWT.
5. The service-role key is server-only (`src/lib/supabase/admin.ts`, no
   `NEXT_PUBLIC_` prefix, throws if imported in the browser). A missing key
   returns **503** — it must never silently fall back to the anon key, which
   would report success while RLS hid every row.

### Triggers
- **Primary: a nightly GitHub Actions cron** (`.github/workflows/storage-cleanup.yml`).
  Free on any plan, and it runs whether or not anyone is active. `pg_cron` is
  also available on Supabase Free if you prefer it in-database.
- **Secondary: after a successful photo upload**, fire-and-forget from the
  client. Hooked to uploads rather than logins because uploads are the only
  action that grows the bucket. Never awaited, never blocks the check-in, and
  **never toasted** — the participant just logged their day; a storage message
  would be meaningless to them.
- **Reactive retry on a quota error ships deliberately inert.**
  `isStorageQuotaError` returns `false` for everything until someone observes
  what Supabase actually returns on quota exhaustion. Guessing is dangerous
  here: a matcher that caught a network blip or an RLS denial would respond to
  a transient error by permanently deleting 50 other people's photos — and it
  would look like it worked. Match on `code`/`status` only, never on
  `message` (§0). Fill it in from the `[storage] upload failed` log line.

---

## 10. Contact Support & Feedback

### Help & Feedback
- We use simple `mailto:` links for contact and support rather than complex ticketing or feature-request systems.
- Accessible from a **persistent help icon** (bottom-right FAB or settings menu).
- Opens default email client to send an email to the support address.
- **Support address**: `beni.rossi@gmail.com` — used for both support requests and feature proposals.

---

## 11. Localization (EN + DE) — MANDATORY

> **Every user-facing string in this app must exist in both English and German.** No exceptions.

- Locales: **`en`** and **`de`**. The header language switch changes the entire site, not just one page.
- All copy lives in the single dictionary at `src/lib/i18n.tsx`. Adding a key to `en` **requires** adding it to `de` in the same change.
- Components must never hardcode user-facing text. Use `const { t } = useI18n()` and `t('some.key')`; outside React use `translate(locale, key)`.
- Placeholders use `{name}` and **must match exactly** between the two languages.
- Library code that produces user-facing copy (e.g. `validateChallengeDates`) returns a **translation key**, never a finished sentence.
- The chosen locale persists in `localStorage` under `75_locale`, is applied pre-paint by the layout's init script, and is mirrored to `<html lang>`.
- Product nouns stay untranslated by design: the reaction names (Fire, Beast, Launch, Hype) and the brand "75 Challenge".
- Default rule titles are generated in the user's language at signup; once saved they are that user's own text and are never re-translated.
- `src/test/i18n.test.ts` enforces all of the above — it fails the build if a key, a translation, or a placeholder is missing.

---

## 12. Mobile First — MANDATORY

> **Always design and implement UI with a strictly Mobile First approach.**
> Write the base styles for the smallest screen, and add `@media (min-width: …)`
> blocks *only* where a larger screen genuinely needs something different.

This project uses **vanilla CSS, not Tailwind** (§1), so the directive is the
same idea expressed in our own system: base rules are the phone layout, and
`min-width` queries play the role `sm:` / `md:` / `lg:` prefixes would elsewhere.

### The rules
1. **Base styles are mobile.** If you find yourself writing a `max-width` query
   to undo a desktop layout on small screens, the component is backwards — start
   again from the phone.
2. **Breakpoints**: `sm 480px`, `md 768px`, `lg 1024px`. Documented in
   `globals.css`; use these literals, not ad-hoc numbers.
3. **Never hardcode a layout dimension in an inline `style`.** Inline styles
   cannot hold media queries, which is precisely how this app ended up with 351
   inline style blocks and exactly one media query. Layout belongs in a class.
4. **Use the layout utilities** in `globals.css` rather than reinventing them:
   `.stack` (column → row from `sm`/`md` via `.stack-row-sm` / `.stack-row-md`),
   `.split` (stacks below 640px, space-between above), `.card-grid`,
   `.section` / `.page` for vertical rhythm, `.btn-block` for full-width
   buttons on mobile.
5. **Fluid type**: `.h-hero`, `.h-page`, `.h-section` use `clamp()`. A fixed
   `2.5rem` heading overflows a 360px screen.
6. **Touch targets ≥ 44px** under `@media (pointer: coarse)`. Already applied to
   `.btn`, `.icon-btn`, `.menu-item` and the language switch.
7. **Use `dvh`, not `vh`.** Mobile browser chrome makes `100vh` overflow.
8. **Rounded corners and the viewport edge are mutually exclusive.** A box is
   either *full-bleed* — flush to both edges with `border-radius: 0` — or it
   *keeps the gutter* and may be rounded. A rounded box touching the edge
   reads as broken, and a full-bleed box with a radius shows two odd notches.
   Never a hair of margin: either zero, or the full gutter.
9. **The gutter is one token, `--gutter`.** `.container` pads by it, full-bleed
   elements offset by `calc(var(--gutter) * -1)`, and `.modal-backdrop` pads by
   it so modals never hug the edge. Never hardcode `-1rem` to cancel a gutter —
   it silently desyncs the moment the gutter changes, which is exactly how
   modals ended up 12px from the edge with rounded corners.
10. **Text must never collide or be clipped by a neighbour.** In any row that
   puts variable-length content (a display name) next to fixed content (a
   badge, a button), all three of these are required — `min-width: 0` on the
   flexible column alone is not enough, because the *text* still overflows:
   - the flexible column gets `min-width: 0`,
   - its text gets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`,
   - the fixed element gets `flex-shrink: 0`.
11. **In a dense row, prefer a symbol to a label.** A compact badge (`1|75`,
   not "Day 1 of 75") and an icon-only button (a follow icon, not "Following")
   keep a row readable at 360px. The meaning must still be reachable — put the
   full wording in `aria-label` and `title`, never drop it entirely.
12. **Wide content scrolls in its own box** (`.scroll-x`, or `overflow-x: auto`),
   never widening the page. The body must never scroll horizontally.
13. **Modals are near-full-screen sheets on mobile** and floating cards from
   `sm` up — see `.modal-content`.

### Verifying
Check every change at **360px** width before considering it done. If a phone has
to scroll sideways, or a control is under 44px, it is not finished.

---

## 13. Theming (Dark + Light)

- Both a **dark** (default) and a **light** theme ship, toggled from the header and persisted in `localStorage` under `75_theme`. With no stored choice the OS `prefers-color-scheme` is followed.
- The layout runs a blocking init script so the correct theme paints on first frame — no flash.
- **Every colour resolves through a CSS custom property** declared in `globals.css`. `:root` holds the dark palette; `[data-theme='light']` re-declares the same token names.
- Never hardcode a colour that differs between themes in a component — add a token. The one deliberate exception is `MilestoneCard`, which is an exported share image and keeps a fixed dark palette regardless of theme.

### Layering & Overlays
- All z-indexes come from the `--z-*` scale in `globals.css` (`--z-base`, `--z-fab`, `--z-nav`, `--z-menu`, `--z-modal`).
- **Modals must be rendered through `ModalPortal`**, which portals them to `document.body`. `.container` sets `position: relative; z-index: 1`, creating a stacking context — an overlay left inside one gets painted over by later siblings such as the footer.
- The footer is a normal flow element (`.site-footer`) in a flex-column body. It must never be positioned or given a z-index that competes with content.

---

## 14. UI/UX Design Standards

### Voice & Tone — MANDATORY

The product is **open, empathetic, supportive and community-driven**. It is not a
bootcamp. Earlier copy leaned on "hard discipline", "unbreakable", "zero
toxicity" and similar — that register is retired; do not reintroduce it.

**Write like this:**
- Address the reader as an equal who has decided to do something for themselves.
- Assume good faith. Someone who misses a day had a reason.
- Say what happens, not what they should feel about it.
- "You decide", "you are the judge", "together", "no shame in that".

**Not like this:**
- Commands, military framing, or anything implying we are watching.
- Shame or loss framing around a missed day or a reset.
- Hype adjectives standing in for substance ("unbreakable", "beast mode").

**Anchors:**
- Title: **"Challenge Yourself"**
- Shared goal: **finish the 75 days by 31 December 2026** — the deadline is a
  constant in `src/lib/challenge-goal.ts`, never typed into a sentence.
- The user is accountable **only to themselves**; the community supports, never grades.

### Design Philosophy
- **Premium, modern aesthetic** — dark mode primary, glassmorphism accents, vibrant gradients.
- **Typography**: Google Fonts (Inter or Outfit).
- **Micro-animations** on every interactive element.
- **No placeholders** — use real or generated assets.

### Icons & Favicons
- The brand mark is the **flame** used beside the logo. Icon set: `src/app/icon.svg` (scalable), `src/app/favicon.ico` (multi-size 16/32/48), `src/app/apple-icon.png` (180×180, opaque), plus `public/icon-192.png` / `public/icon-512.png` (maskable) referenced by `public/manifest.webmanifest`.

### Key Components
| Component | Purpose |
|---|---|
| `LandingPreview` | Static preview posts for unauthenticated visitors |
| `OnboardingModal` | Full sign-up flow with rule transfer |
| `SimpleAuthForm` | Email + password form (min 5 chars) |
| `RuleCustomizer` | Add/edit/delete rules with schedule type picker |
| `DailyChecklist` | Checkbox matrix for daily rule completion |
| `ShieldModal` | "Use Shield" vs "Hard Reset" decision prompt |
| `FeedCard` | Strava-style activity card with reactions |
| `HypeButton` | Animated reaction button with confetti |
| `UserProfileView` | 75-day calendar grid + stats |
| `MilestoneCard` | Component formatted for 9:16 Instagram Story exports |
| `ConsistencyHeatmap` | Group progress matrix visualization |
| `HelpFeedback` | Simple mailto link component for support/features |
| `SiteHeader` | Logo, language switch, theme toggle, Log In / Join or account menu |
| `SiteFooter` | Sticky footer, never overlapping content |
| `ModalPortal` | Portals overlays to `document.body` and locks body scroll |
| `FeedStream` | Shared community feed (used by `/` when signed in, and `/feed`) |
| `ChallengeProvider` | Auth session → challenge. The single source of "who am I" |
| `DayLockedCard` | Replaces the check-in form once the day is settled |
| `Toast` / `ConfirmDialog` | Translated, non-blocking feedback. Never use `alert`/`confirm` |

---

## 15. Critical Business Rules Summary

1. **Min 5-char password** — no complexity requirements.
2. **Min 2 active rules** to start a challenge.
3. **Start date & duration** — 75 consecutive days. If the calculated finish date extends beyond December 31st, an informative notice is shown, but users are permitted to join.
4. **Self-paced trust check-ins** — users log their habits asynchronously. **No artificial cutoff hour** (no midnight or 3 AM lockout); we trust participants to check off their own progress.
5. **1 Streak Shield per attempt** — if a user willingly reports a failed day, they are prompted **once** to deploy their shield or accept a reset to Day 1 (with a clear warning that this wipes progress).
6. **Subsequent failure with 0 shields** = reset to Day 1.
7. **New accounts start on Day 1 with an empty log.** Never pre-fill days.
8. **No text comments, no downvotes** — reactions only.
9. **Cold-start threshold: < 2 users** → show static preview posts in feed. Feed query must filter `daily_logs` to show ONLY 'completed' or 'shielded' statuses.
10. **Client-side image compression before every upload**, to the budget in `image-compressor.ts`; over the hard ceiling it throws rather than uploading (see §9.1).
11. **Export Utility** to handle converting the `MilestoneCard` DOM element into a downloadable image (e.g. `html-to-image`).
12. **Every user-facing string exists in English AND German** (see §11).
12b. **Mobile First is mandatory** — base styles are the phone; `min-width` only (see §12).
12c. **Between 3 and 11 habits**, editable in place, changeable once from day 8 (see §3).
12d. **Password minimum is 6**, from `PASSWORD_MIN_LENGTH`, never typed into copy (see §0).
12e. **Tone is supportive, never disciplinarian** (see §14).
13. **Every colour goes through a CSS token** so both themes work (see §13).
14. **Overlays render through `ModalPortal`** so nothing paints over them (see §13).
15. **A completed day is locked** — final, not editable (see §4).
16. **The database is the source of truth**, not `localStorage` (see §2).
17. **Never persist a `blob:` URL.** Upload to Storage and store the returned URL (see §9).
18. **No `alert()` or `confirm()`** — use the toast/confirm components so messages are translated and non-blocking.
19. **Sample feed posts vanish once someone posts today**, and are labelled as samples while shown (see §5).

---

## 16. Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-side only
```

---

> ⚠️ **REMINDER**: Always re-read this file before starting any work session. If any rule here conflicts with a request, this document takes precedence unless explicitly overridden by the user.
