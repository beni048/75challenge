import { describe, it, expect } from 'vitest';
import {
  getEffectiveLogDate,
  formatDate,
  parseDate,
  calculateTargetEndDate,
  calculateCurrentDay,
  validateChallengeDates,
  generate75DayDates,
} from '@/lib/date-utils';

describe('Date & Time Utilities', () => {
  describe('getEffectiveLogDate & formatDate', () => {
    it('formats dates consistently to YYYY-MM-DD', () => {
      const date = new Date(2026, 8, 15); // Sept 15
      expect(formatDate(date)).toBe('2026-09-15');
      expect(getEffectiveLogDate(date)).toBe('2026-09-15');
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

  describe('validateChallengeDates', () => {
    it('accepts start dates within current year finishing before Dec 31', () => {
      const result = validateChallengeDates('2026-09-01');
      expect(result.valid).toBe(true);
      expect(result.endDate).toBe('2026-11-14');
      expect(result.infoNotice).toBeUndefined();
    });

    it('allows joining and shows infoNotice when end date exceeds Dec 31', () => {
      const result = validateChallengeDates('2026-10-25');
      expect(result.valid).toBe(true);
      expect(result.endDate).toBe('2027-01-07');
      expect(result.infoNotice).toContain('new year');
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
