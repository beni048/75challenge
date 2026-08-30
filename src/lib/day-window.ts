/**
 * Builds the previous/current/next slots for the day picker.
 *
 * Pure and date-string only, so the whole windowing rule is unit-testable
 * without rendering anything (testing.md).
 */

import { parseDate, formatDate, calculateCurrentDay, CHALLENGE_LENGTH_DAYS } from './date-utils';
import type { DaySlot, DayState } from '@/components/DayWindow';

export interface DayWindowLog {
  log_date: string;
  status: 'completed' | 'shielded' | 'failed';
}

/** Shifts a YYYY-MM-DD date string by whole days. */
export function shiftDate(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function stateFor(
  date: string,
  today: string,
  logsByDate: Map<string, DayWindowLog>
): DayState {
  const log = logsByDate.get(date);
  if (log?.status === 'completed') return 'completed';
  if (log?.status === 'shielded') return 'shielded';
  // Nothing after today can have an outcome yet.
  if (date > today) return 'future';
  if (log?.status === 'failed') return 'missed';
  // A past day with no log at all is still catchable, not yet a miss —
  // consistent with pending-days.ts, which never auto-fails anything.
  return 'open';
}

/**
 * Three slots centred on `selectedDate`.
 *
 * `dayNumber` is null outside the 75-day window, which is how the header knows
 * to say "outside your challenge" rather than inventing a day number — note
 * `calculateCurrentDay` clamps to 1..75 and so cannot express that itself.
 */
export function buildDayWindow(
  selectedDate: string,
  startDate: string,
  today: string,
  logs: DayWindowLog[]
): DaySlot[] {
  const logsByDate = new Map(logs.map((log) => [log.log_date, log]));
  const endDate = shiftDate(startDate, CHALLENGE_LENGTH_DAYS - 1);

  return [-1, 0, 1].map((offset) => {
    const date = shiftDate(selectedDate, offset);
    const withinChallenge = date >= startDate && date <= endDate;

    return {
      date,
      dayNumber: withinChallenge ? calculateCurrentDay(startDate, date) : null,
      state: stateFor(date, today, logsByDate),
    };
  });
}

/** Whether the window can move without leaving the challenge entirely. */
export function canStep(
  selectedDate: string,
  startDate: string,
  direction: -1 | 1
): boolean {
  const next = shiftDate(selectedDate, direction);
  const endDate = shiftDate(startDate, CHALLENGE_LENGTH_DAYS - 1);
  return next >= startDate && next <= endDate;
}
