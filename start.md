# 🏁 75 Challenge — Project Rules & Reference

> **READ THIS FILE BEFORE EVERY WORK SESSION.**
> This is the single source of truth for all product requirements, architecture constraints, and design decisions.
>
> 🐙 **GIT & GITHUB OPERATIONS**: When performing any Git or GitHub work (branching, committing, pull requests), always consult the [GitHub Git Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/github.md) guidelines. This includes the **dev → production promotion rule**: all new work lands on `dev` (deployed to `dev.75challenge.quest`) first; `main` (deployed to `75challenge.quest`) only receives changes that have been tested on dev and explicitly approved by the user. Never push a feature straight to `main`.
>
> 🧪 **TESTING & PRE-DEPLOYMENT RULES**: **ALWAYS** run tests (`npm test`) and type-check (`npm run build`) before pushing code or triggering deployments. Always consult the [Testing Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/testing.md) guide before modifying or adding tests.

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
| Image Compression | Client-side Canvas API → WebP (< 200 KB) | — |

### Hard Constraints
- **Supabase Storage limit**: 1 GB — client-side image compression is mandatory.
- **Vercel Free Tier**: Serverless functions only, no persistent backend.
- **No Tailwind CSS**: Use vanilla CSS with a custom design system.
- **No SSR secrets leaking**: All Supabase keys via `NEXT_PUBLIC_` env vars for the anon key; service role key server-side only.

---

## 2. Authentication & Sessions

### Auth Strategy
- **Method**: Email + Password (simple registration).
- **Password Policy**: Minimum **5 characters**. No forced uppercase, numbers, or special symbols.
- **Session Persistence**: Supabase SSR with persistent HTTP-only refresh tokens. Users stay logged in across daily sessions without re-authenticating.

### Sign-Up Flow ("Join the 75 Challenge")
Required fields:
1. **Display Name** (real name or pseudonym)
2. **Email** + **Password** (min 5 chars)
3. **Rule Set** (selected in signup modal)
4. **Start Date** — previewed dynamically with calculated end date. If the end date finishes after December 31st, an informational notice is displayed, but users are still allowed to join.

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
- Users **can** edit, add, or delete rules.
- **Minimum 2 active rules** required to commit.
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
- **Signed out** — hero section with the core vision, the introduction (three pillars + trust statement), and a **read-only** feed preview below it. The preview is illustrative only: nothing in it is clickable. Primary CTA is **"Join 75 Challenge"**.
- **Signed in** — the community feed *is* the landing page. There is no separate "Community Feed" nav link.

### Header
- Signed out: language switch, theme toggle, **Log In**, **Join 75 Challenge**.
- Signed in: language switch, theme toggle, **account avatar menu** (My Challenge / Edit Rules / Password & Security / Log Out).

### Sample Media
- Feed preview posts carry generated sample images from `public/samples/` so visitors see what a real post looks like. Per §11 these are generated assets, not grey placeholder boxes.

---

## 9. Database Schema

> **Source of truth: `supabase/migrations/0001_initial_schema.sql`.** That file is
> what actually runs. Apply it to the dev project first, then production
> (github.md §4). The summary below is orientation only — if it disagrees with
> the migration, the migration wins.

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
Bucket `proof-photos`, public read. Photos are compressed to WebP < 200 KB in the
browser *before* upload to stay inside the 1 GB free tier. **Only the durable
Storage URL is ever persisted on a log** — a `blob:` preview URL dies with the
page and renders broken after a reload.

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

## 12. Theming (Dark + Light)

- Both a **dark** (default) and a **light** theme ship, toggled from the header and persisted in `localStorage` under `75_theme`. With no stored choice the OS `prefers-color-scheme` is followed.
- The layout runs a blocking init script so the correct theme paints on first frame — no flash.
- **Every colour resolves through a CSS custom property** declared in `globals.css`. `:root` holds the dark palette; `[data-theme='light']` re-declares the same token names.
- Never hardcode a colour that differs between themes in a component — add a token. The one deliberate exception is `MilestoneCard`, which is an exported share image and keeps a fixed dark palette regardless of theme.

### Layering & Overlays
- All z-indexes come from the `--z-*` scale in `globals.css` (`--z-base`, `--z-fab`, `--z-nav`, `--z-menu`, `--z-modal`).
- **Modals must be rendered through `ModalPortal`**, which portals them to `document.body`. `.container` sets `position: relative; z-index: 1`, creating a stacking context — an overlay left inside one gets painted over by later siblings such as the footer.
- The footer is a normal flow element (`.site-footer`) in a flex-column body. It must never be positioned or given a z-index that competes with content.

---

## 13. UI/UX Design Standards

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

## 14. Critical Business Rules Summary

1. **Min 5-char password** — no complexity requirements.
2. **Min 2 active rules** to start a challenge.
3. **Start date & duration** — 75 consecutive days. If the calculated finish date extends beyond December 31st, an informative notice is shown, but users are permitted to join.
4. **Self-paced trust check-ins** — users log their habits asynchronously. **No artificial cutoff hour** (no midnight or 3 AM lockout); we trust participants to check off their own progress.
5. **1 Streak Shield per attempt** — if a user willingly reports a failed day, they are prompted **once** to deploy their shield or accept a reset to Day 1 (with a clear warning that this wipes progress).
6. **Subsequent failure with 0 shields** = reset to Day 1.
7. **New accounts start on Day 1 with an empty log.** Never pre-fill days.
8. **No text comments, no downvotes** — reactions only.
9. **Cold-start threshold: < 2 users** → show static preview posts in feed. Feed query must filter `daily_logs` to show ONLY 'completed' or 'shielded' statuses.
10. **Client-side image compression** to WebP < 200 KB before upload.
11. **Export Utility** to handle converting the `MilestoneCard` DOM element into a downloadable image (e.g. `html-to-image`).
12. **Every user-facing string exists in English AND German** (see §11).
13. **Every colour goes through a CSS token** so both themes work (see §12).
14. **Overlays render through `ModalPortal`** so nothing paints over them (see §12).
15. **A completed day is locked** — final, not editable (see §4).
16. **The database is the source of truth**, not `localStorage` (see §2).
17. **Never persist a `blob:` URL.** Upload to Storage and store the returned URL (see §9).
18. **No `alert()` or `confirm()`** — use the toast/confirm components so messages are translated and non-blocking.
19. **Sample feed posts vanish once someone posts today**, and are labelled as samples while shown (see §5).

---

## 15. Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-side only
```

---

> ⚠️ **REMINDER**: Always re-read this file before starting any work session. If any rule here conflicts with a request, this document takes precedence unless explicitly overridden by the user.
