/**
 * Date and Time utilities for 75 Challenge
 * Handles standard date formatting, 75-day calculations, and informational date notices.
 */

/**
 * Returns the effective log date (YYYY-MM-DD) for local time.
 */
export function getEffectiveLogDate(now: Date = new Date()): string {
  return formatDate(now);
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
  end.setDate(end.getDate() + 74);
  return formatDate(end);
}

/**
 * Calculates current day number (1-indexed) in the 75-day challenge.
 */
export function calculateCurrentDay(startDateStr: string, effectiveDateStr: string = getEffectiveLogDate()): number {
  const start = parseDate(startDateStr);
  const current = parseDate(effectiveDateStr);
  
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Before start
  return Math.min(diffDays + 1, 75); // 1 to 75
}

/**
 * Evaluates start date and end date. If the challenge ends after Dec 31st,
 * provides an informational notice, but always allows joining (`valid: true`).
 */
export function validateChallengeDates(startDateStr: string): {
  valid: boolean;
  endDate: string;
  infoNotice?: string;
  error?: string;
} {
  if (!startDateStr) {
    return { valid: false, endDate: '', error: 'Please select a valid start date.' };
  }

  const startDate = parseDate(startDateStr);
  const year = startDate.getFullYear();
  const endDate = calculateTargetEndDate(startDateStr);
  const parsedEndDate = parseDate(endDate);
  const dec31 = new Date(year, 11, 31, 23, 59, 59);

  let infoNotice: string | undefined = undefined;

  if (parsedEndDate > dec31) {
    infoNotice = `Your 75-day challenge concludes in the new year on ${endDate}.`;
  }

  return { valid: true, endDate, infoNotice };
}

/**
 * Generates an array of all 75 dates (YYYY-MM-DD) for a given start date.
 */
export function generate75DayDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDateStr);
  for (let i = 0; i < 75; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}
