import { describe, it, expect } from 'vitest';
import {
  getEffectiveLogDate,
  formatDate,
  parseDate,
  calculateTargetEndDate,
  calculateCurrentDay,
  hasStarted,
  validateChallengeDates,
  generate75DayDates,
} from '@/lib/date-utils';
import { translate } from '@/lib/i18n';

describe('Date & Time Utilities', () => {
  describe('getEffectiveLogDate & formatDate', () => {
    it('formats dates consistently to YYYY-MM-DD', () => {
      const date = new Date(2026, 8, 15); // Sept 15
      expect(formatDate(date)).toBe('2026-09-15');
    });

    it('resolves "today" as experienced in the given timezone, not the host clock', () => {
      // A single UTC instant that is two different calendar dates depending
      // on the zone: 23:30 UTC on March 15 is still March 15 in Los Angeles
      // (UTC-7 with DST in March) but already March 16 in Tokyo (UTC+9).
      const instant = new Date('2026-03-15T23:30:00Z');
      expect(getEffectiveLogDate('America/Los_Angeles', instant)).toBe('2026-03-15');
      expect(getEffectiveLogDate('Asia/Tokyo', instant)).toBe('2026-03-16');
    });

    it('returns a YYYY-MM-DD string for the real current instant when now is omitted', () => {
      expect(getEffectiveLogDate('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('parses YYYY-MM-DD into a local Date object', () => {
      const parsed = parseDate('2026-09-01');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(8); // 0-indexed September
      expect(parsed.getDate()).toBe(1);
    });
  });

  describe('calculateTargetEndDate (75-day span)', () => {
    it('calculates start + 74 days accurately', () => {
      // Sept 1 + 74 days = Nov 14
      expect(calculateTargetEndDate('2026-09-01')).toBe('2026-11-14');
      // Oct 20 + 74 days = Jan 02
      expect(calculateTargetEndDate('2026-10-20')).toBe('2027-01-02');
    });
  });

  describe('calculateCurrentDay', () => {
    it('returns day 1 on the start date', () => {
      expect(calculateCurrentDay('2026-09-01', '2026-09-01')).toBe(1);
    });

    it('returns day 15 after 14 elapsed days', () => {
      expect(calculateCurrentDay('2026-09-01', '2026-09-15')).toBe(15);
    });

    it('caps at 75', () => {
      expect(calculateCurrentDay('2026-09-01', '2026-12-01')).toBe(75);
    });
  });

  describe('hasStarted', () => {
    it('is false before the start date', () => {
      expect(hasStarted('2026-09-01', '2026-08-31')).toBe(false);
    });

    it('is true on the start date itself', () => {
      expect(hasStarted('2026-09-01', '2026-09-01')).toBe(true);
    });

    it('is true after the start date', () => {
      expect(hasStarted('2026-09-01', '2026-09-02')).toBe(true);
    });
  });

  describe('validateChallengeDates', () => {
    it('accepts start dates within current year finishing before Dec 31', () => {
      const result = validateChallengeDates('2026-09-01');
      expect(result.valid).toBe(true);
      expect(result.endDate).toBe('2026-11-14');
      expect(result.infoNoticeKey).toBeUndefined();
    });

    it('still allows joining when the 75 days run past Dec 31, with a notice', () => {
      const result = validateChallengeDates('2026-10-25');
      expect(result.valid).toBe(true);
      expect(result.endDate).toBe('2027-01-07');
      expect(result.infoNoticeKey).toBe('dates.crossesYearEnd');
      expect(result.infoNoticeVars).toEqual({ date: '2027-01-07', deadline: '2026-12-31' });
      expect(result.meetsSharedGoal).toBe(false);
    });

    it('renders the year-end notice in both languages', () => {
      const result = validateChallengeDates('2026-10-25');
      const key = result.infoNoticeKey!;

      // Both languages must name the user's own finish date and the shared goal.
      expect(translate('en', key, result.infoNoticeVars)).toContain('2027-01-07');
      expect(translate('en', key, result.infoNoticeVars)).toContain('2026-12-31');
      expect(translate('de', key, result.infoNoticeVars)).toContain('2027-01-07');
      expect(translate('de', key, result.infoNoticeVars)).toContain('2026-12-31');
    });

    it('rejects an empty start date', () => {
      const result = validateChallengeDates('');
      expect(result.valid).toBe(false);
      expect(result.errorKey).toBe('dates.invalid');
    });
  });

  describe('generate75DayDates', () => {
    it('generates exactly 75 consecutive dates starting from start date', () => {
      const dates = generate75DayDates('2026-09-01');
      expect(dates.length).toBe(75);
      expect(dates[0]).toBe('2026-09-01');
      expect(dates[74]).toBe('2026-11-14');
    });
  });
});
