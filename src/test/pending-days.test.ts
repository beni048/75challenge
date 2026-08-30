import { describe, it, expect } from 'vitest';
import { getPendingDates } from '@/lib/pending-days';
import { Rule, DailyLog } from '@/lib/streak-engine';

describe('Pending days', () => {
  const start = '2026-09-01';
  const dailyRule: Rule = { id: 'r1', title: 'Read', schedule_type: 'daily' };

  it('is empty before the challenge has started', () => {
    expect(getPendingDates('2026-09-10', [dailyRule], [], '2026-09-05')).toEqual([]);
  });

  it('is empty on day 1 itself — today is not pending', () => {
    expect(getPendingDates(start, [dailyRule], [], '2026-09-01')).toEqual([]);
  });

  it('lists every unlogged past day, oldest first', () => {
    expect(getPendingDates(start, [dailyRule], [], '2026-09-04')).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('excludes a day that already has any log, regardless of status', () => {
    const logs: DailyLog[] = [{ log_date: '2026-09-02', status: 'completed' }];
    expect(getPendingDates(start, [dailyRule], logs, '2026-09-04')).toEqual(['2026-09-01', '2026-09-03']);
  });

  it('excludes a rest day where no rule was scheduled', () => {
    const workdaysOnly: Rule = { id: 'r2', title: 'Gym', schedule_type: 'workdays' };
    // 2026-09-05 is a Saturday — a rest day for a workdays-only rule set.
    expect(getPendingDates('2026-09-01', [workdaysOnly], [], '2026-09-07')).not.toContain('2026-09-05');
  });
});
