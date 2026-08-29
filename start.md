# 🏁 75 Challenge — Project Rules & Reference

> **READ THIS FILE BEFORE EVERY WORK SESSION.**
> This is the single source of truth for all product requirements, architecture constraints, and design decisions.
>
> 🐙 **GIT & GITHUB OPERATIONS**: When performing any Git or GitHub work (branching, committing, pull requests), always consult the [GitHub Git Rules & Best Practices](file:///home/benjamin/workspace/github.com/beni048/75challenge/github.md) guidelines.

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
3. **Rule Set** (transferred from Rule Builder if used on landing page)
4. **Start Date** — must be within **September** of the current year
5. **Hard Deadline**: challenge window (start + 74 days) must finish **on or before December 31st**. End date previewed dynamically.

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

## 4. 3:00 AM Reset Cutoff & Streak Shield System

### 3:00 AM Grace Period
- Daily operational cycle: **3:00 AM → 2:59 AM local time** (not midnight).
- Accommodates night-owl logging.
- All date calculations must use this cutoff, not calendar midnight.

### Asynchronous Check-ins
- Daily logging is **not** strictly required in real-time.
- Past days appear as **retroactive checkbox matrices** — users can log previous days.

### Streak Shield Mechanic
- Each user receives exactly **1 Streak Shield** per 75-day attempt.
- If a day passes uncompleted (after 3:00 AM cutoff):
  - **Prompt**: "Use your 1 Streak Shield" **OR** "Accept Hard Reset to Day 1"
  - If shield is used → day marked as `shielded`, challenge continues.
  - A **second** missed day → **immediate hard reset to Day 1** (no choice).

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

## 8. Landing Page & Try-Before-Signup

### Landing Page (`/`)
- Unauthenticated visitors see an **interactive landing page** with static preview posts.
- **Interactive Rule Builder**: visitors customize rules on the landing page.
- Clicking **"Commit & Launch 75 Days"** transfers configured rules into the sign-up modal.

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

-- Support Tickets Table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'account', 'general')) NOT NULL DEFAULT 'general',
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Proposals Table
CREATE TABLE feature_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'under_review', 'planned', 'completed', 'declined')) NOT NULL DEFAULT 'pending',
  upvote_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Proposal Upvotes Table
CREATE TABLE feature_upvotes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  proposal_id UUID REFERENCES feature_proposals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, proposal_id)
);
```

---

## 10. Contact Support & Propose Feature

### Contact Support
- Accessible from a **persistent help icon** (bottom-right FAB or settings menu).
- Route: `/support`
- Logged-in users can submit a support ticket with:
  - **Subject** (text, required)
  - **Category** dropdown: `Bug Report`, `Account Issue`, `General`
  - **Message** (textarea, required, max 2000 chars)
- Tickets are stored in `support_tickets` table.
- Users can view their own ticket history and status on the `/support` page.
- Status flow: `open` → `in_progress` → `resolved` / `closed`.
- **No admin panel in v1** — tickets are managed directly in Supabase dashboard.

### Propose Feature
- Route: `/features`
- Logged-in users can submit a feature proposal with:
  - **Title** (text, required, max 100 chars)
  - **Description** (textarea, required, max 1000 chars)
- All proposals are publicly visible to logged-in users, sorted by upvote count (descending).
- **Upvote mechanic**: Each user can upvote a proposal **once** (toggle on/off). Upvote count is denormalized on `feature_proposals.upvote_count` for fast sorting.
- Status badges shown per proposal: `Pending`, `Under Review`, `Planned`, `Completed`, `Declined`.
- **Rate limit**: Max 3 proposals per user per week (enforced client-side + RLS).
- Proposals cannot be edited or deleted by the user after submission.

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
| `SupportForm` | Contact support ticket submission form |
| `SupportTicketList` | User's own ticket history with status badges |
| `FeatureProposalForm` | Submit a new feature proposal |
| `FeatureProposalCard` | Displays a proposal with upvote button + count |
| `FeatureBoard` | Sortable list of all proposals |

---

## 12. Critical Business Rules Summary

1. **Min 5-char password** — no complexity requirements.
2. **Min 2 active rules** to start a challenge.
3. **Start date must be in September** of the current year.
4. **End date (start + 74 days) must be ≤ December 31st**.
5. **3:00 AM local time** is the day boundary, not midnight.
6. **1 Streak Shield per attempt** — no more, no less.
7. **Second missed day = hard reset** — no exceptions.
8. **No text comments, no downvotes** — reactions only.
9. **Cold-start threshold: < 2 users** → show static preview posts in feed.
10. **Client-side image compression** to WebP < 200 KB before upload.
11. **Support tickets** — max 2000 chars per message, managed via Supabase dashboard.
12. **Feature proposals** — max 3 per user per week, 1 upvote per user per proposal, no edits after submission.

---

## 13. Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-side only
```

---

> ⚠️ **REMINDER**: Always re-read this file before starting any work session. If any rule here conflicts with a request, this document takes precedence unless explicitly overridden by the user.
