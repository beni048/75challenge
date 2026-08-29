/**
 * The community's shared finish line.
 *
 * Everyone is working towards the same date, which is what makes this a group
 * effort rather than 500 people each running a private 75 days. The deadline is
 * a constant rather than copy so the date shown to users and the date the start
 * picker validates against can never disagree.
 */

import {
  CHALLENGE_DEADLINE,
  CHALLENGE_LENGTH_DAYS,
  calculateTargetEndDate,
  formatDate,
  parseDate,
} from './date-utils';

export { CHALLENGE_DEADLINE };

/**
 * The last date someone can start and still finish by the deadline.
 * For a 75-day challenge ending 2026-12-31 this is 2026-10-18.
 */
export function latestStartDate(deadline: string = CHALLENGE_DEADLINE): string {
  const end = parseDate(deadline);
  end.setDate(end.getDate() - (CHALLENGE_LENGTH_DAYS - 1));
  return formatDate(end);
}

/** True when a challenge started on this date finishes on or before the deadline. */
export function finishesBeforeDeadline(
  startDate: string,
  deadline: string = CHALLENGE_DEADLINE
): boolean {
  return calculateTargetEndDate(startDate) <= deadline;
}
