/**
 * "Pending" days — past days with no outcome yet.
 *
 * There is deliberately no `daily_logs.status = 'pending'` value: a pending
 * day is a *derived* fact (a rest-day-free date, strictly before today, with
 * no log row at all), not stored state. Once the owner acts on one — catches
 * it up, or reports it missed via the existing Shield/reset flow — a real
 * `daily_logs` row appears and it stops being pending by construction.
 */

import { generate75DayDates, hasStarted } from './date-utils';
import { Rule, DailyLog, getRequiredRulesForDate } from './streak-engine';

/**
 * Every date the owner could still catch up on: on the calendar for their
 * 75 days, strictly before `today` (today itself belongs to the live
 * checklist, not catch-up), not a rest day (no rule was scheduled), and
 * carrying no log yet. Oldest first.
 */
export function getPendingDates(
  startDate: string,
  rules: Rule[],
  logs: DailyLog[],
  today: string
): string[] {
  if (!hasStarted(startDate, today)) return [];

  const loggedDates = new Set(logs.map((log) => log.log_date));

  return generate75DayDates(startDate).filter(
    (date) =>
      date < today && !loggedDates.has(date) && getRequiredRulesForDate(rules, date).length > 0
  );
}
