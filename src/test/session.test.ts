import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  loadSession,
  saveSession,
  clearSession,
  upsertLog,
  applyShield,
  resetToDayOne,
  SESSION_STORAGE_KEY,
} from '@/lib/session';
import { getDefaultRules } from '@/components/RuleCustomizer';
import { calculateCurrentDay, getEffectiveLogDate } from '@/lib/date-utils';

const rules = getDefaultRules('en');

const newSession = (startDate = getEffectiveLogDate()) =>
  createSession({
    username: 'test_user',
    displayName: 'Test User',
    email: 'test@example.com',
    startDate,
    rules,
  });

describe('Challenge session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('createSession', () => {
    it('starts a brand-new account on Day 1 with no logged days', () => {
      const session = newSession();

      expect(session.logs).toEqual([]);
      expect(calculateCurrentDay(session.start_date)).toBe(1);
    });

    it('grants exactly one Streak Shield', () => {
      expect(newSession().shields_remaining).toBe(1);
    });

    it('derives the target end date from the start date', () => {
      expect(newSession('2026-09-01').target_end_date).toBe('2026-11-14');
    });
  });

  describe('persistence', () => {
    it('round-trips through localStorage', () => {
      const session = newSession('2026-09-01');
      saveSession(session);

      const loaded = loadSession();
      expect(loaded?.username).toBe('test_user');
      expect(loaded?.logs).toEqual([]);
    });

    it('treats a stored session without logs as having no completed days', () => {
      // Sessions written by earlier versions had no `logs` field at all; they
      // must not resurrect as a challenge with pre-filled days.
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ username: 'legacy', start_date: '2026-09-01' })
      );

      expect(loadSession()?.logs).toEqual([]);
    });

    it('returns null when nothing is stored', () => {
      expect(loadSession()).toBeNull();
    });

    it('returns null for corrupted storage rather than throwing', () => {
      window.localStorage.setItem(SESSION_STORAGE_KEY, 'not json');
      expect(loadSession()).toBeNull();
    });

    it('clears the stored session', () => {
      saveSession(newSession());
      clearSession();
      expect(loadSession()).toBeNull();
    });
  });

  describe('upsertLog', () => {
    it('adds a log for a new date', () => {
      const updated = upsertLog(newSession(), { log_date: '2026-09-01', status: 'completed' });
      expect(updated.logs).toHaveLength(1);
    });

    it('replaces an existing log for the same date instead of duplicating it', () => {
      const first = upsertLog(newSession(), { log_date: '2026-09-01', status: 'completed' });
      const second = upsertLog(first, { log_date: '2026-09-01', status: 'shielded' });

      expect(second.logs).toHaveLength(1);
      expect(second.logs[0].status).toBe('shielded');
    });
  });

  describe('applyShield', () => {
    it('spends the shield and marks the day as shielded', () => {
      const shielded = applyShield(newSession(), '2026-09-05');

      expect(shielded.shields_remaining).toBe(0);
      expect(shielded.logs).toEqual([{ log_date: '2026-09-05', status: 'shielded' }]);
    });

    it('never drops below zero shields', () => {
      const once = applyShield(newSession(), '2026-09-05');
      const twice = applyShield(once, '2026-09-08');

      expect(twice.shields_remaining).toBe(0);
    });
  });

  describe('resetToDayOne', () => {
    it('clears logs, restores the shield, and restarts from today', () => {
      const used = applyShield(newSession('2026-09-01'), '2026-09-05');
      const reset = resetToDayOne(used);

      expect(reset.logs).toEqual([]);
      expect(reset.shields_remaining).toBe(1);
      expect(reset.start_date).toBe(getEffectiveLogDate());
      expect(calculateCurrentDay(reset.start_date)).toBe(1);
    });

    it('keeps the account identity intact', () => {
      const reset = resetToDayOne(newSession());
      expect(reset.username).toBe('test_user');
      expect(reset.rules).toHaveLength(rules.length);
    });
  });
});
