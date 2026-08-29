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
  describe('getEffectiveLogDate (3:00 AM cutoff)', () => {
    it('returns today date when time is >= 3:00 AM', () => {
      // 2026-09-15 03:00:00
      const date = new Date(2026, 8, 15, 3, 0, 0);
      expect(getEffectiveLogDate(date)).toBe('2026-09-15');

      // 2026-09-15 23:59:59
      const nightDate = new Date(2026, 8, 15, 23, 59, 59);
      expect(getEffectiveLogDate(nightDate)).toBe('2026-09-15');
    });

    it('rolls back to yesterday when time is < 3:00 AM', () => {
      // 2026-09-16 02:59:59 (night owl logging)
      const lateNightDate = new Date(2026, 8, 16, 2, 59, 59);
      expect(getEffectiveLogDate(lateNightDate)).toBe('2026-09-15');

      // 2026-09-16 00:00:01
      const midnightDate = new Date(2026, 8, 16, 0, 0, 1);
      expect(getEffectiveLogDate(midnightDate)).toBe('2026-09-15');
    });
  });

  describe('formatDate & parseDate', () => {
    it('formats dates consistently to YYYY-MM-DD', () => {
      const date = new Date(2026, 8, 5); // Sept 5
      expect(formatDate(date)).toBe('2026-09-05');
    });

    it('parses YYYY-MM-DD into a local Date without timezone shifting', () => {
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
      // Sept 15 + 74 days = Nov 28
      expect(calculateTargetEndDate('2026-09-15')).toBe('2026-11-28');
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
    it('accepts start dates within September finishing before Dec 31', () => {
      const result = validateChallengeDates('2026-09-01');
      expect(result.valid).toBe(true);
      expect(result.endDate).toBe('2026-11-14');
    });

    it('rejects start dates outside of September', () => {
      const octResult = validateChallengeDates('2026-10-01');
      expect(octResult.valid).toBe(false);
      expect(octResult.error).toContain('September');

      const augResult = validateChallengeDates('2026-08-31');
      expect(augResult.valid).toBe(false);
      expect(augResult.error).toContain('September');
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
