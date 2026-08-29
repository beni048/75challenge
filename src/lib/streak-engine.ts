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
  needsShieldPrompt: boolean;
  missedDate?: string;
  completedDaysCount: number;
}

/**
 * Evaluates the full challenge status up to yesterday's effective date.
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

  // Map logs by date for fast lookup
  const logsByDate = new Map<string, DailyLog>();
  logs.forEach((log) => logsByDate.set(log.log_date, log));

  const shields = user.shields_remaining;
  let status = user.status;
  let completedDaysCount = 0;
  let needsShieldPrompt = false;
  let missedDate: string | undefined = undefined;

  // Calculate day index from start_date
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, Math.min(diffDays + 1, 75));

  // Check all past days up to yesterday
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);

    const log = logsByDate.get(dateStr);
    const requiredRules = getRequiredRulesForDate(rules, dateStr);

    if (requiredRules.length === 0) {
      // No rules on this day, count as satisfied
      completedDaysCount++;
      continue;
    }

    if (!log || log.status === 'failed') {
      // Missed day detected
      if (shields > 0) {
        needsShieldPrompt = true;
        missedDate = dateStr;
      } else {
        status = 'failed';
      }
    } else if (log.status === 'shielded') {
      // Already shielded day
      completedDaysCount++;
    } else if (log.status === 'completed') {
      completedDaysCount++;
    }
  }

  if (completedDaysCount >= 75 && status === 'active') {
    status = 'completed';
  }

  return {
    currentDay,
    shieldsRemaining: shields,
    status,
    needsShieldPrompt,
    missedDate,
    completedDaysCount,
  };
}
