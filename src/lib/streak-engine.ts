/**
 * Streak and Shield evaluation engine.
 * Calculates compliance for scheduled rules and manages 1 Streak Shield per attempt.
 */

import { parseDate, formatDate, getEffectiveLogDate } from './date-utils';

export type ScheduleType = 'daily' | 'workdays' | 'custom';

export interface Rule {
  id: string;
  user_id?: string;
  title: string;
  schedule_type: ScheduleType;
  custom_days?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export interface DailyLog {
  id?: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  status: 'completed' | 'shielded' | 'failed';
  photo_url?: string | null;
  caption?: string | null;
  rule_checks?: { rule_id: string; is_completed: boolean }[];
}

export interface UserChallengeProfile {
  id: string;
  username: string;
  display_name: string;
  start_date: string;
  target_end_date: string;
  current_day: number;
  shields_remaining: number;
  status: 'active' | 'failed' | 'completed';
}

/**
 * Checks if a specific rule is active on a given date.
 */
export function isRuleScheduledForDate(rule: Rule, dateStr: string): boolean {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

  if (rule.schedule_type === 'daily') {
    return true;
  }

  if (rule.schedule_type === 'workdays') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (rule.schedule_type === 'custom') {
    return (rule.custom_days || []).includes(dayOfWeek);
  }

  return true;
}

/**
 * Returns all rules that are required for a specific date.
 */
export function getRequiredRulesForDate(rules: Rule[], dateStr: string): Rule[] {
  return rules.filter((r) => isRuleScheduledForDate(r, dateStr));
}

export interface StreakEvaluationResult {
  currentDay: number;
  shieldsRemaining: number;
  status: 'active' | 'failed' | 'completed';
  /** True when the user should be asked to spend their shield or restart. */
  needsShieldPrompt: boolean;
  /** The earliest day awaiting a decision — what the prompt is about. */
  missedDate?: string;
  /** Every past day that is neither completed nor shielded, oldest first. */
  missedDates: string[];
  completedDaysCount: number;
}

/**
 * Evaluates a challenge as of `now`, looking only at days that are already over.
 *
 * "Missed" means a past day that carries no log, or a log explicitly marked
 * failed. Today is never judged — the user still has time to check in.
 *
 * Shield accounting: a day already recorded as `shielded` has *already* spent a
 * shield, which is reflected in `user.shields_remaining`. So the question here
 * is only whether the shields still in hand can cover the days awaiting a
 * decision. One unresolved day with a shield left → prompt. More unresolved days
 * than shields → the challenge is failed and has to restart from Day 1
 * (start.md §14, rules 5 and 6).
 */
export function evaluateUserChallenge(
  user: UserChallengeProfile,
  rules: Rule[],
  logs: DailyLog[],
  now: Date = new Date()
): StreakEvaluationResult {
  const effectiveToday = getEffectiveLogDate(now);
  const start = parseDate(user.start_date);
  const today = parseDate(effectiveToday);

  const logsByDate = new Map<string, DailyLog>();
  logs.forEach((log) => logsByDate.set(log.log_date, log));

  const shieldsRemaining = user.shields_remaining;
  let completedDaysCount = 0;
  const missedDates: string[] = [];

  // Whole days elapsed since the start date. Day 1 is the start date itself, so
  // this is also the number of days that are already over.
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, Math.min(diffDays + 1, 75));

  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);

    // A rest day (no rule scheduled) can never be missed.
    if (getRequiredRulesForDate(rules, dateStr).length === 0) {
      completedDaysCount++;
      continue;
    }

    const log = logsByDate.get(dateStr);

    if (!log || log.status === 'failed') {
      missedDates.push(dateStr);
    } else {
      // 'completed' and 'shielded' both keep the streak alive.
      completedDaysCount++;
    }
  }

  let status = user.status;
  let needsShieldPrompt = false;

  if (missedDates.length > shieldsRemaining) {
    // More days need forgiving than there are shields to forgive them with.
    status = 'failed';
  } else if (missedDates.length > 0) {
    needsShieldPrompt = true;
  }

  if (completedDaysCount >= 75 && status === 'active') {
    status = 'completed';
  }

  return {
    currentDay,
    shieldsRemaining,
    status,
    needsShieldPrompt,
    missedDate: missedDates[0],
    missedDates,
    completedDaysCount,
  };
}
