import { describe, it, expect } from 'vitest';
import { CHALLENGE_DEADLINE, latestStartDate, finishesBeforeDeadline } from '@/lib/challenge-goal';
import { MIN_RULES, MAX_RULES, hasEnoughRules, canAddRule } from '@/lib/rules-policy';
import { calculateTargetEndDate, formatLongDate } from '@/lib/date-utils';

describe('Shared challenge goal', () => {
  it('targets the end of 2026', () => {
    expect(CHALLENGE_DEADLINE).toBe('2026-12-31');
  });

  it('computes the last start date that still meets the deadline', () => {
    // 75 days inclusive, so the final start is 74 days before the deadline.
    expect(latestStartDate()).toBe('2026-10-18');
    expect(calculateTargetEndDate('2026-10-18')).toBe(CHALLENGE_DEADLINE);
  });

  it('accepts a start on the last possible day', () => {
    expect(finishesBeforeDeadline('2026-10-18')).toBe(true);
  });

  it('flags a start one day too late', () => {
    expect(finishesBeforeDeadline('2026-10-19')).toBe(false);
  });

  it('formats the deadline for prose in both languages', () => {
    expect(formatLongDate(CHALLENGE_DEADLINE, 'en')).toBe('31 December 2026');
    expect(formatLongDate(CHALLENGE_DEADLINE, 'de')).toBe('31. Dezember 2026');
  });
});

describe('Rule bounds', () => {
  it('requires at least 3 habits', () => {
    expect(MIN_RULES).toBe(3);
    expect(hasEnoughRules(MIN_RULES - 1)).toBe(false);
    expect(hasEnoughRules(MIN_RULES)).toBe(true);
  });

  it('allows at most 11 habits', () => {
    expect(MAX_RULES).toBe(11);
    expect(canAddRule(MAX_RULES - 1)).toBe(true);
    expect(canAddRule(MAX_RULES)).toBe(false);
  });
});
