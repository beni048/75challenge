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
}

export interface RuleRow {
  id: string;
  user_id: string;
  title: string;
  schedule_type: ScheduleType;
  custom_days: number[];
  position: number;
}

export interface DailyLogRow {
  id: string;
  user_id: string;
  log_date: string;
  status: LogStatus;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
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
