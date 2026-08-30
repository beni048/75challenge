/**
 * When a participant may change their habits.
 *
 * They commit up front, then get exactly one adjustment from day 8 onward —
 * the first week is what tells you whether you aimed too high or too low.
 * The database enforces this too (see 0002_rules_change_window.sql); this
 * module exists so the UI can explain the state rather than just fail.
 */

import { calculateCurrentDay } from './date-utils';

/** The change unlocks once this day is reached. */
export const RULES_CHANGE_UNLOCKS_ON_DAY = 8;

export type RulesChangeState =
  /** Still inside the first week. */
  | { status: 'locked'; unlocksOnDay: number; currentDay: number }
  /** Past day 7 with the allowance unspent. */
  | { status: 'available' }
  /** The single change has been used. */
  | { status: 'used'; changedAt: string };

export function getRulesChangeState(
  startDate: string,
  rulesChangedAt: string | null,
  today: string
): RulesChangeState {
  if (rulesChangedAt) return { status: 'used', changedAt: rulesChangedAt };

  const currentDay = calculateCurrentDay(startDate, today);
  if (currentDay < RULES_CHANGE_UNLOCKS_ON_DAY) {
    return { status: 'locked', unlocksOnDay: RULES_CHANGE_UNLOCKS_ON_DAY, currentDay };
  }

  return { status: 'available' };
}

export function canChangeRules(
  startDate: string,
  rulesChangedAt: string | null,
  today: string
): boolean {
  return getRulesChangeState(startDate, rulesChangedAt, today).status === 'available';
}
