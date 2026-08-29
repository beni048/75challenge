import { describe, it, expect } from 'vitest';
import {
  isRuleScheduledForDate,
  getRequiredRulesForDate,
  evaluateUserChallenge,
  Rule,
  DailyLog,
  UserChallengeProfile,
} from '@/lib/streak-engine';

describe('Streak & Shield Engine', () => {
  const sampleRules: Rule[] = [
    { id: 'rule-daily', title: 'Daily Workout', schedule_type: 'daily' },
    { id: 'rule-workdays', title: 'Workday Focus', schedule_type: 'workdays' },
    { id: 'rule-custom', title: 'Custom MWF', schedule_type: 'custom', custom_days: [1, 3, 5] },
  ];

  describe('Rule Scheduling Logic', () => {
    it('evaluates daily rules active on all days', () => {
      expect(isRuleScheduledForDate(sampleRules[0], '2026-09-06')).toBe(true); // Sunday
      expect(isRuleScheduledForDate(sampleRules[0], '2026-09-07')).toBe(true); // Monday
    });

    it('evaluates workdays rules active Mon-Fri and inactive Sat-Sun', () => {
      expect(isRuleScheduledForDate(sampleRules[1], '2026-09-07')).toBe(true); // Monday
      expect(isRuleScheduledForDate(sampleRules[1], '2026-09-11')).toBe(true); // Friday
      expect(isRuleScheduledForDate(sampleRules[1], '2026-09-06')).toBe(false); // Sunday
      expect(isRuleScheduledForDate(sampleRules[1], '2026-09-12')).toBe(false); // Saturday
    });

    it('evaluates custom days accurately', () => {
      expect(isRuleScheduledForDate(sampleRules[2], '2026-09-07')).toBe(true); // Monday (1)
      expect(isRuleScheduledForDate(sampleRules[2], '2026-09-08')).toBe(false); // Tuesday (2)
      expect(isRuleScheduledForDate(sampleRules[2], '2026-09-09')).toBe(true); // Wednesday (3)
    });

    it('filters required rules for a given date', () => {
      // 2026-09-07 is a Monday (daily + workdays + custom MWF = 3 rules)
      const mondayRules = getRequiredRulesForDate(sampleRules, '2026-09-07');
      expect(mondayRules.length).toBe(3);

      // 2026-09-06 is a Sunday (only daily = 1 rule)
      const sundayRules = getRequiredRulesForDate(sampleRules, '2026-09-06');
      expect(sundayRules.length).toBe(1);
    });
  });

  describe('Challenge State Machine & Shield Triggers', () => {
    const baseUser: UserChallengeProfile = {
      id: 'test-user-1',
      username: 'testwarrior',
      display_name: 'Test Warrior',
      start_date: '2026-09-01',
      target_end_date: '2026-11-14',
      current_day: 4,
      shields_remaining: 1,
      status: 'active',
    };

    const rules: Rule[] = [
      { id: 'r1', title: 'Rule 1', schedule_type: 'daily' },
      { id: 'r2', title: 'Rule 2', schedule_type: 'daily' },
    ];

    it('remains active with no prompt when all past days are completed', () => {
      const logs: DailyLog[] = [
        { log_date: '2026-09-01', status: 'completed' },
        { log_date: '2026-09-02', status: 'completed' },
        { log_date: '2026-09-03', status: 'completed' },
      ];

      // Evaluation on day 4 (2026-09-04 12:00)
      const evalDate = new Date(2026, 8, 4, 12, 0, 0);
      const result = evaluateUserChallenge(baseUser, rules, logs, evalDate);

      expect(result.status).toBe('active');
      expect(result.needsShieldPrompt).toBe(false);
      expect(result.completedDaysCount).toBe(3);
      expect(result.shieldsRemaining).toBe(1);
    });

    it('triggers shield prompt on first missed past day if shield is available', () => {
      const logsWithMiss: DailyLog[] = [
        { log_date: '2026-09-01', status: 'completed' },
        // 2026-09-02 is MISSING
        { log_date: '2026-09-03', status: 'completed' },
      ];

      const evalDate = new Date(2026, 8, 4, 12, 0, 0);
      const result = evaluateUserChallenge(baseUser, rules, logsWithMiss, evalDate);

      expect(result.needsShieldPrompt).toBe(true);
      expect(result.missedDate).toBe('2026-09-02');
      expect(result.shieldsRemaining).toBe(1);
    });

    it('triggers status = failed on second missed day or when shield is 0', () => {
      const userWithoutShield: UserChallengeProfile = {
        ...baseUser,
        shields_remaining: 0,
      };

      const logsWithMiss: DailyLog[] = [
        { log_date: '2026-09-01', status: 'completed' },
        // 2026-09-02 missing
        { log_date: '2026-09-03', status: 'completed' },
      ];

      const evalDate = new Date(2026, 8, 4, 12, 0, 0);
      const result = evaluateUserChallenge(userWithoutShield, rules, logsWithMiss, evalDate);

      expect(result.status).toBe('failed');
      expect(result.needsShieldPrompt).toBe(false);
    });
  });
});
