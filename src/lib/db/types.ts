/**
 * Row shapes for the tables in supabase/migrations/0001_initial_schema.sql.
 *
 * These are hand-written rather than generated so the repo has no codegen step.
 * If you change the migration, change these to match.
 */

import type { ScheduleType } from '../streak-engine';

export type ChallengeStatus = 'active' | 'failed' | 'completed';
export type LogStatus = 'completed' | 'shielded' | 'failed';
export type SecretRulesVisibility = 'placeholder' | 'hidden';
/**
 * How forgiving a shield is, chosen at signup and locked for the attempt.
 * See src/lib/shield-policy.ts for what each tier actually does — this file
 * only owns the wire shape.
 */
export type CommitmentLevel = 'purist' | 'classic' | 'flex';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  start_date: string;
  target_end_date: string;
  shields_remaining: number;
  status: ChallengeStatus;
  referred_by_id: string | null;
  created_at: string;
  /** Present since migration 0002; was missing from this hand-maintained type. */
  updated_at: string;
  /** When the one-time post-day-7 rule change was used. Null = still available. */
  rules_changed_at: string | null;
  /** IANA zone, e.g. 'Europe/Zurich'. Always the source of "today" for this user — see date-utils.ts. */
  timezone: string;
  location: string | null;
  avatar_url: string | null;
  /** How this user's secret rules appear to non-owners. See get_visible_rules(). */
  secret_rules_visibility: SecretRulesVisibility;
  commitment_level: CommitmentLevel;
  /** Date the current shield was spent, if any. Null = a shield is available (subject to tier — see shield-policy.ts). */
  last_shield_used_at: string | null;
  /** Feature-announcement keys already shown to this account — supabase.md §5. */
  acknowledged_updates: string[];
}

export interface RuleRow {
  id: string;
  user_id: string;
  title: string;
  schedule_type: ScheduleType;
  custom_days: number[];
  position: number;
  is_secret: boolean;
}

export interface DailyLogRow {
  id: string;
  user_id: string;
  log_date: string;
  status: LogStatus;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
  /** Present since migration 0002; was missing from this hand-maintained type. */
  updated_at: string;
  /** Non-null when this log was written as part of a multi-day catch-up — see pending-days.ts. */
  batch_id: string | null;
  /** The one phrase claimed for this post by whoever hyped it first (0008). */
  hype_phrase_id: string | null;
  hype_claimed_by: string | null;
}

export interface LogRuleCheckRow {
  log_id: string;
  rule_id: string;
  is_completed: boolean;
}

/**
 * One hype per person per post — see src/lib/hype-phrases.ts for what
 * `phrase_id` actually resolves to in each locale. There is deliberately no
 * free-text field: a phrase id always points at a curated, bilingual entry,
 * never user-authored text (start.md §7 — no downvotes, no comments).
 */
/**
 * One row per person who hyped a post. Since 0008 the SENTENCE lives on
 * daily_logs (claimed by the first hyper); a reaction row now just means
 * "this person agrees". `phrase_id` is retained until 0007 drops it.
 */
export interface ReactionRow {
  log_id: string;
  sender_id: string;
  phrase_id: string;
  updated_at: string;
}

export type ChallengeEventType = 'reset';

/** A challenge-lifecycle announcement (currently just resets) — see restartChallenge. */
export interface ChallengeEventRow {
  id: string;
  user_id: string;
  event_type: ChallengeEventType;
  created_at: string;
}

/** A participant's complete challenge, assembled from users + rules + logs. */
export interface Challenge {
  id: string;
  username: string;
  displayName: string;
  startDate: string;
  targetEndDate: string;
  shieldsRemaining: number;
  status: ChallengeStatus;
  referredById: string | null;
  rulesChangedAt: string | null;
  timezone: string;
  location: string | null;
  avatarUrl: string | null;
  secretRulesVisibility: SecretRulesVisibility;
  commitmentLevel: CommitmentLevel;
  lastShieldUsedAt: string | null;
  /** Feature-announcement keys this account has already seen — supabase.md §5. */
  acknowledgedUpdates: string[];
  rules: RuleRow[];
  logs: DailyLogRow[];
}

/**
 * A failure that should be shown to the user rather than swallowed.
 * Every db helper returns this shape instead of throwing, so callers can
 * render a message without try/catch at each call site.
 */
export interface DbResult<T> {
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): DbResult<T> {
  return { data, error: null };
}

export function fail<T>(error: unknown): DbResult<T> {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Something went wrong. Please try again.';
  console.error('[db]', error);
  return { data: null, error: message };
}
