import { describe, it, expect } from 'vitest';
import { buildDayWindow, canStep, shiftDate, type DayWindowLog } from '@/lib/day-window';
import { countCompletedDays, completionPercent } from '@/lib/day-progress';

const START = '2026-09-01'; // day 1
const END = '2026-11-14'; // day 75

describe('shiftDate', () => {
  it('moves forward and backward across a month boundary', () => {
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDate('2026-10-01', -1)).toBe('2026-09-30');
  });
});

describe('buildDayWindow', () => {
  const logs: DayWindowLog[] = [
    { log_date: '2026-09-01', status: 'completed' },
    { log_date: '2026-09-02', status: 'shielded' },
    { log_date: '2026-09-03', status: 'failed' },
  ];

  it('centres three slots on the selected day', () => {
    const slots = buildDayWindow('2026-09-05', START, '2026-09-05', logs);
    expect(slots.map((s) => s.date)).toEqual(['2026-09-04', '2026-09-05', '2026-09-06']);
  });

  it('numbers days relative to the start date', () => {
    const slots = buildDayWindow('2026-09-05', START, '2026-09-05', logs);
    expect(slots.map((s) => s.dayNumber)).toEqual([4, 5, 6]);
  });

  it('reflects each stored outcome', () => {
    const slots = buildDayWindow('2026-09-02', START, '2026-09-10', logs);
    expect(slots.map((s) => s.state)).toEqual(['completed', 'shielded', 'missed']);
  });

  it('marks anything after today as future, never as missed', () => {
    const slots = buildDayWindow('2026-09-10', START, '2026-09-10', []);
    expect(slots.map((s) => s.state)).toEqual(['open', 'open', 'future']);
  });

  it('leaves an unlogged past day open rather than failing it', () => {
    // Nothing is ever auto-failed (start.md §4) — it stays catchable.
    const slots = buildDayWindow('2026-09-05', START, '2026-09-20', []);
    expect(slots.every((s) => s.state === 'open')).toBe(true);
  });

  it('has no day number outside the 75-day window', () => {
    const before = buildDayWindow(START, START, START, []);
    expect(before[0].dayNumber).toBeNull(); // the day before day 1
    const after = buildDayWindow(END, START, END, []);
    expect(after[2].dayNumber).toBeNull(); // the day after day 75
  });
});

describe('canStep', () => {
  it('refuses to step before day 1 or past day 75', () => {
    expect(canStep(START, START, -1)).toBe(false);
    expect(canStep(END, START, 1)).toBe(false);
  });

  it('allows stepping inside the window', () => {
    expect(canStep('2026-09-05', START, -1)).toBe(true);
    expect(canStep('2026-09-05', START, 1)).toBe(true);
  });
});

describe('day progress', () => {
  it('counts completed and shielded days, never failed ones', () => {
    expect(
      countCompletedDays([
        { status: 'completed' },
        { status: 'shielded' },
        { status: 'failed' },
      ])
    ).toBe(2);
  });

  it('measures percent against the whole challenge, not the day reached', () => {
    // 12 days banked is 16% of 75 — not 53% just because it is day 40.
    expect(completionPercent(Array(12).fill({ status: 'completed' }))).toBe(16);
  });

  it('is 0 at the start and 100 when every day is banked', () => {
    expect(completionPercent([])).toBe(0);
    expect(completionPercent(Array(75).fill({ status: 'completed' }))).toBe(100);
  });

  it('cannot exceed 100 even with stray extra logs', () => {
    expect(completionPercent(Array(90).fill({ status: 'completed' }))).toBe(100);
  });
});
