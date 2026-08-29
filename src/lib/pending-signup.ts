'use client';

/**
 * Holds a signup's challenge configuration between "account created" and
 * "challenge row written".
 *
 * Those two steps are not always adjacent: if the Supabase project requires
 * email confirmation, `signUp` returns no session, and RLS will refuse the
 * insert until the user clicks the link in their inbox. Rather than lose their
 * chosen rules and start date, we park them here and flush them the first time
 * the user shows up authenticated without a challenge.
 *
 * This is short-lived scratch data, not a source of truth — the database is.
 */

import type { Rule } from './streak-engine';

const KEY = '75_pending_signup';

export interface PendingSignup {
  displayName: string;
  startDate: string;
  rules: Rule[];
  referredByUsername: string | null;
}

export function savePendingSignup(pending: PendingSignup): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Storage blocked — the user can still re-enter their rules.
  }
}

export function loadPendingSignup(): PendingSignup | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSignup>;
    if (!parsed.displayName || !parsed.startDate || !Array.isArray(parsed.rules)) return null;

    return {
      displayName: parsed.displayName,
      startDate: parsed.startDate,
      rules: parsed.rules,
      referredByUsername: parsed.referredByUsername ?? null,
    };
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do — a stale entry is harmless once the challenge exists.
  }
}
