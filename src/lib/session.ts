'use client';

/**
 * Local challenge session.
 *
 * The challenge profile (rules, logs, streak state) lives in localStorage so the
 * app works without a backend round-trip. Supabase Auth owns credentials only —
 * see `src/lib/auth.ts`. Every mutation goes through `saveSession`, which emits a
 * `75:session` event so the header and any open page re-read the same state.
 */

import { Rule, DailyLog } from './streak-engine';
import { calculateTargetEndDate, getEffectiveLogDate } from './date-utils';

export const SESSION_STORAGE_KEY = '75_user_session';
export const SESSION_EVENT = '75:session';

export interface ChallengeSession {
  id: string;
  username: string;
  display_name: string;
  email: string;
  start_date: string;
  target_end_date: string;
  shields_remaining: number;
  status: 'active' | 'failed' | 'completed';
  referred_by?: string | null;
  rules: Rule[];
  logs: DailyLog[];
}

/**
 * Builds a brand-new session. A fresh account always starts at Day 1 with an
 * empty log history — no days are pre-filled.
 */
export function createSession(input: {
  username: string;
  displayName: string;
  email: string;
  startDate: string;
  rules: Rule[];
  referredBy?: string | null;
}): ChallengeSession {
  return {
    id: `user-${Date.now()}`,
    username: input.username,
    display_name: input.displayName,
    email: input.email,
    start_date: input.startDate,
    target_end_date: calculateTargetEndDate(input.startDate),
    shields_remaining: 1,
    status: 'active',
    referred_by: input.referredBy ?? null,
    rules: input.rules,
    logs: [],
  };
}

function normalize(raw: unknown): ChallengeSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<ChallengeSession>;
  if (!value.username || !value.start_date) return null;

  return {
    id: value.id ?? `user-${Date.now()}`,
    username: value.username,
    display_name: value.display_name ?? value.username,
    email: value.email ?? '',
    start_date: value.start_date,
    target_end_date: value.target_end_date ?? calculateTargetEndDate(value.start_date),
    shields_remaining: typeof value.shields_remaining === 'number' ? value.shields_remaining : 1,
    status: value.status ?? 'active',
    referred_by: value.referred_by ?? null,
    rules: Array.isArray(value.rules) ? value.rules : [],
    // Older sessions were persisted without logs; treat them as an empty history
    // rather than inventing completed days.
    logs: Array.isArray(value.logs) ? value.logs : [],
  };
}

/**
 * Parses a stored session string. Returns null for absent or corrupt data
 * rather than throwing, so a bad write can never lock someone out.
 */
export function parseSession(raw: string | null): ChallengeSession | null {
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadSession(): ChallengeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseSession(window.localStorage.getItem(SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session: ChallengeSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked — keep the in-memory state and notify anyway.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Records (or replaces) a daily log entry.
 */
export function upsertLog(session: ChallengeSession, log: DailyLog): ChallengeSession {
  return {
    ...session,
    logs: [...session.logs.filter((l) => l.log_date !== log.log_date), log],
  };
}

/**
 * Spends the single Streak Shield on a missed day.
 */
export function applyShield(session: ChallengeSession, missedDate: string): ChallengeSession {
  return {
    ...upsertLog(session, { log_date: missedDate, status: 'shielded' }),
    shields_remaining: Math.max(0, session.shields_remaining - 1),
  };
}

/**
 * Restarts the challenge from Day 1 today, with a fresh shield and no history.
 */
export function resetToDayOne(session: ChallengeSession): ChallengeSession {
  const startDate = getEffectiveLogDate();
  return {
    ...session,
    start_date: startDate,
    target_end_date: calculateTargetEndDate(startDate),
    shields_remaining: 1,
    status: 'active',
    logs: [],
  };
}
