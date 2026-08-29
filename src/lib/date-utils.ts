/**
 * Date and Time utilities for 75 Challenge
 * Handles the 3:00 AM local time reset cutoff and 75-day calculations.
 */

/**
 * Returns the effective log date (YYYY-MM-DD) for local time.
 * If the current time is before 3:00 AM, the effective date is yesterday.
 */
export function getEffectiveLogDate(now: Date = new Date()): string {
  const local = new Date(now);
  const hour = local.getHours();
  
  if (hour < 3) {
    local.setDate(local.getDate() - 1);
  }
  
  return formatDate(local);
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
 * Calculates current day number (1-indexed) in the 75-day challenge based on effective date.
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
 * Validates start date is within September of current year and ends on or before Dec 31st.
 */
export function validateChallengeDates(startDateStr: string): { valid: boolean; error?: string; endDate: string } {
  const startDate = parseDate(startDateStr);
  const year = startDate.getFullYear();
  const month = startDate.getMonth(); // 0-indexed, 8 is September
  
  const endDate = calculateTargetEndDate(startDateStr);
  const parsedEndDate = parseDate(endDate);
  const dec31 = new Date(year, 11, 31, 23, 59, 59);

  if (month !== 8) {
    return { valid: false, error: 'Start date must be in September.', endDate };
  }

  if (parsedEndDate > dec31) {
    return { valid: false, error: 'The 75-day challenge must conclude on or before December 31st.', endDate };
  }

  return { valid: true, endDate };
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
