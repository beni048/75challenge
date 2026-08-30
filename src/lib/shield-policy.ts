/**
 * Commitment tiers and how the Streak Shield behaves under each.
 *
 * Shield availability is **derived, never stored as a counter** — the same
 * approach the schema already takes for `current_day`, and for the same
 * reason: a mutable counter is a second source of truth that drifts. The only
 * facts persisted are the tier the participant chose and the date they last
 * spent a shield; everything else follows from those two by pure function.
 *
 * There is deliberately **no scheduled job** behind any of this. The app has
 * no midnight rollover and no cutoff hour of any kind (start.md §4) — a day is
 * never auto-failed. A shield is only ever spent when the participant
 * *voluntarily* reports a missed day, so the tier rules are evaluated at that
 * moment, in `ShieldModal`.
 */

import { parseDate } from './date-utils';

export type CommitmentLevel = 'purist' | 'classic' | 'flex';

export const COMMITMENT_LEVELS: CommitmentLevel[] = ['purist', 'classic', 'flex'];

export const DEFAULT_COMMITMENT_LEVEL: CommitmentLevel = 'classic';

/** How long a Flex shield takes to come back after it is spent. */
export const SHIELD_RECHARGE_DAYS = 25;

/** Announcement key for existing accounts that predate tiers — see supabase.md §5. */
export const COMMITMENT_ANNOUNCEMENT_KEY = 'commitment-level-v1';

/**
 * Total shields a tier grants across the whole attempt. Only used for copy —
 * the authoritative answer to "can I use one right now" is
 * `hasShieldAvailable`.
 */
export function shieldAllowanceFor(level: CommitmentLevel): number {
  if (level === 'purist') return 0;
  if (level === 'classic') return 1;
  // Flex recharges every SHIELD_RECHARGE_DAYS across a 75-day attempt.
  return 3;
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative if `to` precedes `from`. */
function daysBetween(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Whether a shield can be spent right now.
 *
 * - `purist` — never. A missed day resets to Day 1, like the original 75 Hard.
 * - `classic` — once per attempt. This is the legacy behaviour every account
 *   created before commitment tiers already had, which is why it is the
 *   backfill default.
 * - `flex`   — once, then again `SHIELD_RECHARGE_DAYS` after the last spend.
 *
 * A rolling cooldown rather than milestone unlocks at day 25/50: milestones
 * are gameable and unfair at the boundary (a shield spent on day 24 would come
 * back on day 25), whereas "your shield returns 25 days after you use it" is
 * predictable, needs no scheduler, and is derivable from a single date.
 */
export function hasShieldAvailable(
  level: CommitmentLevel,
  lastShieldUsedAt: string | null,
  today: string
): boolean {
  if (level === 'purist') return false;
  if (lastShieldUsedAt === null) return true;
  if (level === 'classic') return false;
  return daysBetween(lastShieldUsedAt, today) >= SHIELD_RECHARGE_DAYS;
}

/**
 * Days until a Flex shield recharges. `null` when one is already available or
 * the tier never recharges — so a caller can render a countdown only when
 * there is genuinely something to count down to.
 */
export function daysUntilShieldReturns(
  level: CommitmentLevel,
  lastShieldUsedAt: string | null,
  today: string
): number | null {
  if (level !== 'flex' || lastShieldUsedAt === null) return null;
  const remaining = SHIELD_RECHARGE_DAYS - daysBetween(lastShieldUsedAt, today);
  return remaining > 0 ? remaining : null;
}

/** Narrows an arbitrary DB string, so a bad value degrades to the safe default. */
export function toCommitmentLevel(value: unknown): CommitmentLevel {
  return COMMITMENT_LEVELS.includes(value as CommitmentLevel)
    ? (value as CommitmentLevel)
    : DEFAULT_COMMITMENT_LEVEL;
}
