/**
 * How far through the 75 days someone actually is.
 *
 * The codebase previously answered this three different ways — the streak
 * engine's `completedDaysCount`, a `logs.filter(l => l.status !== 'failed')`
 * on the profile page, and `MilestoneCard`'s `dayNumber / 75` — and none of
 * them agreed. This module is the single definition.
 *
 * "Done" means a day that was settled positively: `completed`, or `shielded`
 * (the shield exists precisely so the day still counts). A `failed` day, and a
 * day with no log at all, are not done. Pure, so it carries its own tests.
 */

import { CHALLENGE_LENGTH_DAYS } from './date-utils';

export interface DayProgressInput {
  status: 'completed' | 'shielded' | 'failed';
}

/** Days settled positively so far. Never exceeds the challenge length. */
export function countCompletedDays(logs: DayProgressInput[]): number {
  const done = logs.filter((log) => log.status === 'completed' || log.status === 'shielded').length;
  return Math.min(done, CHALLENGE_LENGTH_DAYS);
}

/**
 * Percentage of the whole challenge banked, 0–100, rounded to a whole number.
 *
 * Deliberately measured against days *done*, not the day number reached:
 * sitting on day 40 having logged 12 of them is not 53% of a 75-day
 * challenge, and a ring that says otherwise is flattering rather than useful.
 */
export function completionPercent(logs: DayProgressInput[]): number {
  return Math.round((countCompletedDays(logs) / CHALLENGE_LENGTH_DAYS) * 100);
}
