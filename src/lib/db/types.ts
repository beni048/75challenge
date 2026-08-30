/**
 * Row shapes for the tables in supabase/migrations/0001_initial_schema.sql.
 *
 * These are hand-written rather than generated so the repo has no codegen step.
 * If you change the migration, change these to match.
 */

import type { ScheduleType } from '../streak-engine';

export type ChallengeStatus = 'active' | 'failed' | 'completed';
export type LogStatus = 'completed' | 'shielded' | 'failed';
export type ReactionType = 'fire' | 'beast' | 'launch' | 'hype';
export type SecretRulesVisibility = 'placeholder' | 'hidden';

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
}

export interface LogRuleCheckRow {
  log_id: string;
  rule_id: string;
  is_completed: boolean;
}

export interface ReactionRow {
  log_id: string;
  sender_id: string;
  reaction_type: ReactionType;
  reaction_count: number;
}

export interface UserFollowRow {
  follower_id: string;
  followed_id: string;
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
