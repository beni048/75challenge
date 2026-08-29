import { describe, it, expect } from 'vitest';
import { getRulesChangeState, canChangeRules, RULES_CHANGE_UNLOCKS_ON_DAY } from '@/lib/rules-window';

describe('Rule change window', () => {
  const start = '2026-09-01';

  it('unlocks on day 8', () => {
    expect(RULES_CHANGE_UNLOCKS_ON_DAY).toBe(8);
  });

  it('is locked on day 1', () => {
    const state = getRulesChangeState(start, null, '2026-09-01');
    expect(state).toEqual({ status: 'locked', unlocksOnDay: 8, currentDay: 1 });
  });

  it('is still locked on day 7', () => {
    // Day 7 is 2026-09-07; the change opens the following day.
    expect(canChangeRules(start, null, '2026-09-07')).toBe(false);
  });

  it('becomes available on day 8', () => {
    expect(canChangeRules(start, null, '2026-09-08')).toBe(true);
  });

  it('stays available later in the challenge while unused', () => {
    expect(canChangeRules(start, null, '2026-10-15')).toBe(true);
  });

  it('is spent once used, even well past day 8', () => {
    const state = getRulesChangeState(start, '2026-09-10T10:00:00Z', '2026-10-15');
    expect(state.status).toBe('used');
    expect(canChangeRules(start, '2026-09-10T10:00:00Z', '2026-10-15')).toBe(false);
  });

  it('reports used even before day 8, if somehow already spent', () => {
    expect(canChangeRules(start, '2026-09-02T10:00:00Z', '2026-09-03')).toBe(false);
  });
});
