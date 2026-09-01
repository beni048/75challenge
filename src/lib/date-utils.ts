/**
 * Date and Time utilities for 75 Challenge
 * Handles standard date formatting, 75-day calculations, and informational date notices.
 */

/** How many days the challenge runs. Named so the 75/74 arithmetic is legible. */
export const CHALLENGE_LENGTH_DAYS = 75;

/**
 * The community's shared finish line. Declared here rather than imported from
 * `challenge-goal.ts` because that module imports this one — keeping the raw
 * constant at the bottom of the dependency graph avoids the cycle.
 */
export const CHALLENGE_DEADLINE = '2026-12-31';

/**
 * Returns "today" (YYYY-MM-DD) as experienced in the given IANA timezone.
 *
 * `timezone` is deliberately required, not optional-with-a-browser-local
 * fallback: an optional param is exactly how a timezone bug creeps back in
 * the next time a call site is added and someone forgets to pass it. The
 * rule this app follows everywhere: "today" always means the *profile
 * owner's* stored timezone, never the viewer's device — even when the owner
 * is looking at their own profile, because a challenge's day boundary is a
 * property of whose challenge it is, not of whichever device loaded the
 * page. See start.md §2 for the full rationale.
 *
 * `now` is the true universal instant; `en-CA` formats as YYYY-MM-DD
 * directly, which is what makes this trick work without a date library.
 */
export function getEffectiveLogDate(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * All IANA zone names the runtime knows about, for a timezone picker.
 * `Intl.supportedValuesOf` isn't in every runtime this can render under
 * (older Safari) — callers fall back to just their own detected zone.
 */
export function getSupportedTimezones(): string[] {
  try {
    return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  } catch {
    return [];
  }
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object.
 */
export function parseDate(dateStr: string): Date {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd, 12, 0, 0); // Use noon to avoid DST edge cases
}

/**
 * Calculates target end date (Start Date + 74 days = 75 total days).
 */
export function calculateTargetEndDate(startDateStr: string): string {
  const start = parseDate(startDateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + (CHALLENGE_LENGTH_DAYS - 1));
  return formatDate(end);
}

/**
 * Calculates current day number (1-indexed) in the 75-day challenge.
 *
 * `effectiveDateStr` is required rather than defaulting to "now" — this
 * function is pure date-string arithmetic and never needs a live clock; the
 * caller decides what "today" means (see `getEffectiveLogDate`). For an
 * already-written log, pass that log's own `log_date` — no clock, no
 * timezone, involved at all, since the date was fixed the moment it was
 * written.
 *
 * A future `startDateStr` (challenge hasn't started yet) still clamps to 1
 * here — check `hasStarted()` first if that distinction matters to the
 * caller; this function's return value doesn't encode it.
 */
export function calculateCurrentDay(startDateStr: string, effectiveDateStr: string): number {
  const start = parseDate(startDateStr);
  const current = parseDate(effectiveDateStr);

  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1; // Before start
  return Math.min(diffDays + 1, CHALLENGE_LENGTH_DAYS);
}

/**
 * True once a challenge's start date has arrived (or passed), given today's
 * date. A future start date should show a countdown, not daily tasks —
 * `calculateCurrentDay` alone can't express that distinction, since it
 * clamps a future start to day 1 for display convenience.
 */
export function hasStarted(startDateStr: string, todayStr: string): boolean {
  return todayStr >= startDateStr;
}

/**
 * Formats a date for prose, in the reader's language
 * ("December 31, 2026" / "31. Dezember 2026").
 */
export function formatLongDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDate(dateStr));
}

export interface ChallengeDateEvaluation {
  /** Always true for a parseable date — a year-end overrun never blocks joining. */
  valid: boolean;
  endDate: string;
  /** Translation key for a non-blocking notice, resolved by the caller. */
  infoNoticeKey?: 'dates.crossesYearEnd';
  infoNoticeVars?: Record<string, string>;
  /** True when this start date still meets the community's shared deadline. */
  meetsSharedGoal: boolean;
  /** Translation key for a blocking error. */
  errorKey?: 'dates.invalid' | 'dates.startTooLate';
  errorVars?: Record<string, string>;
}

/**
 * Evaluates a start date against the 75-day window.
 *
 * Two distinct outcomes for "too late", handled differently on purpose:
 *  - Finishing after the deadline is only ever a soft notice — joining is
 *    still allowed (start.md §2, §15.3).
 *  - Starting AFTER the deadline itself is a hard block (`errorKey:
 *    'dates.startTooLate'`) — there is no shared goal to join for a start
 *    date in a cycle that has not been defined yet.
 * Copy is returned as translation keys so both languages render from one
 * source.
 */
export function validateChallengeDates(
  startDateStr: string,
  deadline: string = CHALLENGE_DEADLINE
): ChallengeDateEvaluation {
  if (!startDateStr) {
    return { valid: false, endDate: '', meetsSharedGoal: false, errorKey: 'dates.invalid' };
  }

  const startDate = parseDate(startDateStr);
  if (Number.isNaN(startDate.getTime())) {
    return { valid: false, endDate: '', meetsSharedGoal: false, errorKey: 'dates.invalid' };
  }

  // Hard cutoff, distinct from the soft notice below: a start date past the
  // shared deadline itself cannot belong to this challenge cycle at all — it
  // is not "finishes late", it is "starts in a year with no shared goal yet".
  // Compared against `deadline` (not the literal CHALLENGE_DEADLINE constant)
  // so a caller testing a different cutoff exercises this branch too.
  if (startDateStr > deadline) {
    return {
      valid: false,
      endDate: '',
      meetsSharedGoal: false,
      errorKey: 'dates.startTooLate',
      errorVars: { deadline },
    };
  }

  const endDate = calculateTargetEndDate(startDateStr);
  // Compared against the community's shared finish line, not against the end of
  // whichever year the challenge happens to start in.
  const meetsSharedGoal = endDate <= deadline;

  if (!meetsSharedGoal) {
    return {
      valid: true,
      endDate,
      meetsSharedGoal,
      infoNoticeKey: 'dates.crossesYearEnd',
      infoNoticeVars: { date: endDate, deadline },
    };
  }

  return { valid: true, endDate, meetsSharedGoal };
}

/**
 * Generates an array of all 75 dates (YYYY-MM-DD) for a given start date.
 */
export function generate75DayDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDateStr);
  for (let i = 0; i < CHALLENGE_LENGTH_DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}
