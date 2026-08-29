# 🏁 75 Challenge — Project Rules & Reference

> **READ THIS FILE BEFORE EVERY WORK SESSION.**
> This is the single source of truth for all product requirements, architecture constraints, and design decisions.
>
> 🐙 **GIT & GITHUB OPERATIONS**: When performing any Git or GitHub work (branching, committing, pull requests), always consult the [GitHub Git Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/github.md) guidelines.
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
- Users check off their own daily progress asynchronously. We trust participants to manage their habits.
- No artificial cutoff hours (e.g. 3 AM) — check-ins are recorded for their respective calendar dates.

### Self-Reported Failure & Streak Shield Mechanic
- Each user receives exactly **1 Streak Shield** per 75-day attempt.
- When a user willingly reports or logs a failed day:
  - **Prompt**: "Use your 1 Streak Shield" **OR** "Accept Hard Reset to Day 1" (with a warning that this resets progress to Day 1).
  - If the shield is deployed → day is recorded as `shielded`, progress continues.
  - If a subsequent failure occurs with 0 shields remaining → hard reset to Day 1.

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
- Running weekly activity tracker at the top of feed

### Cold-Start Fallback (< 2 Users)
- If total registered active users **< 2**: feed injects **curated static preview posts** alongside real activity.
- Once registered users **≥ 2**: static previews are hidden; only live DB activity renders.

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
- Public visitors see a high-energy hero section with the core vision, feature highlights, and a primary **"Join 75 Challenge"** CTA.
- Displays the live community feed preview stream below.
- Clicking **"Join 75 Challenge"** opens the onboarding modal with rule configuration, start date selection, and authentication.

---

## 9. Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  current_day INT DEFAULT 1,
  shields_remaining INT DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'failed', 'completed')),
  referred_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rules Table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  schedule_type TEXT CHECK (schedule_type IN ('daily', 'workdays', 'custom')) NOT NULL,
  custom_days INT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Logs Table
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  status TEXT CHECK (status IN ('completed', 'shielded', 'failed')) NOT NULL,
  photo_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- Log Rule Checks Table
CREATE TABLE log_rule_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE
);

-- Reactions Table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT CHECK (reaction_type IN ('fire', 'beast', 'launch', 'hype')) NOT NULL,
  reaction_count INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(log_id, sender_id, reaction_type)
);

-- User Unfollows Table
CREATE TABLE user_unfollows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  unfollowed_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, unfollowed_id)
);
```

---

## 10. Contact Support & Feedback

### Help & Feedback
- We use simple `mailto:` links for contact and support rather than complex ticketing or feature-request systems.
- Accessible from a **persistent help icon** (bottom-right FAB or settings menu).
- Opens default email client to send an email to the support address.

---

## 11. UI/UX Design Standards

### Design Philosophy
- **Premium, modern aesthetic** — dark mode primary, glassmorphism accents, vibrant gradients.
- **Typography**: Google Fonts (Inter or Outfit).
- **Micro-animations** on every interactive element.
- **No placeholders** — use real or generated assets.

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

---

## 12. Critical Business Rules Summary

1. **Min 5-char password** — no complexity requirements.
2. **Min 2 active rules** to start a challenge.
3. **Start date & duration** — 75 consecutive days. If the calculated finish date extends beyond December 31st, an informative notice is shown, but users are permitted to join.
4. **Self-paced trust check-ins** — users log their habits asynchronously without rigid midnight/3AM clock lockouts.
5. **1 Streak Shield per attempt** — if a user willingly reports a failed day, they are prompted once to deploy their shield or accept a hard reset to Day 1.
6. **Subsequent failure with 0 shields** = hard reset to Day 1.
7. **No text comments, no downvotes** — reactions only.
8. **Cold-start threshold: < 2 users** → show static preview posts in feed. Feed query must filter `daily_logs` to show ONLY 'completed' or 'shielded' statuses.
9. **Client-side image compression** to WebP < 200 KB before upload.
10. **Export Utility** to handle converting the `MilestoneCard` DOM element into a downloadable image (e.g. `html-to-image`).

---

## 13. Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-side only
```

---

> ⚠️ **REMINDER**: Always re-read this file before starting any work session. If any rule here conflicts with a request, this document takes precedence unless explicitly overridden by the user.
