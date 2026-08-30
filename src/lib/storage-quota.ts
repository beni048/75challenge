/**
 * Storage-budget policy: the numbers, and the pure decisions made from them.
 *
 * Isomorphic on purpose — the API route, the client-side trigger, and the
 * tests all import from here, so there is exactly one place that knows what
 * "nearly full" means. Never write one of these figures into a comment, a doc
 * or a UI string; import the constant (start.md §17).
 */

/** Supabase free tier. The whole reason this module exists. */
export const STORAGE_QUOTA_BYTES = 1_073_741_824; // 1 GiB

/**
 * Start reclaiming at 70%, stop at 60%.
 *
 * The gap is hysteresis and it is not optional: with a single threshold, every
 * upload past the line would re-trigger a cleanup that frees just enough to
 * dip under it, then immediately cross back. The band means one run does
 * meaningful work and then stays quiet.
 */
export const CLEANUP_TRIGGER_RATIO = 0.7;
export const CLEANUP_TARGET_RATIO = 0.6;

/** One `remove()` round trip. */
export const CLEANUP_BATCH_SIZE = 50;

/**
 * Caps on a single invocation. Vercel's Hobby tier gives a 10s function
 * budget, so the wall-clock deadline — checked before each batch, not just
 * the batch count — is what actually keeps us inside it.
 */
export const CLEANUP_MAX_BATCHES_PER_RUN = 4;
export const CLEANUP_DEADLINE_MS = 8_000;

/** Server-side cooldown between runs. Authoritative. */
export const CLEANUP_COOLDOWN_SECONDS = 900;

/** Client-side advisory throttle, so a busy day doesn't spam the endpoint. */
export const CLIENT_CHECK_COOLDOWN_HOURS = 6;
export const STORAGE_CHECK_STORAGE_KEY = '75_storage_check_at';

export const CLEANUP_TRIGGER_BYTES = Math.round(STORAGE_QUOTA_BYTES * CLEANUP_TRIGGER_RATIO);
export const CLEANUP_TARGET_BYTES = Math.round(STORAGE_QUOTA_BYTES * CLEANUP_TARGET_RATIO);

/** Whether usage has crossed the point where reclaiming should begin. */
export function shouldTriggerCleanup(usedBytes: number): boolean {
  return usedBytes >= CLEANUP_TRIGGER_BYTES;
}

/** How many bytes a run still needs to free. Zero once at or under target. */
export function bytesToReclaim(usedBytes: number): number {
  return Math.max(0, usedBytes - CLEANUP_TARGET_BYTES);
}

/**
 * Extracts the storage object path from a stored public URL.
 *
 * `daily_logs.photo_url` holds a full public URL
 * (`<origin>/storage/v1/object/public/proof-photos/<user-id>/<uuid>.webp`),
 * but the Storage API deletes by bucket-relative path. Returns null for
 * anything that is not a proof-photos URL, so a malformed or foreign value can
 * never be turned into a delete target.
 *
 * Mirrors the SQL `substring(photo_url from '/proof-photos/(.+)$')` used by
 * the cleanup functions in migration 0005 — keep the two in step.
 */
export function objectPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/proof-photos\/(.+)$/.exec(url);
  if (!match) return null;

  const path = match[1].split('?')[0];
  return path.length > 0 ? path : null;
}

/**
 * Whether a failed Storage upload was caused by the project's storage quota
 * being exhausted.
 *
 * **This ships deliberately inert.** The allowlists below are empty, so it
 * returns false for everything, and the reactive cleanup-and-retry path is
 * therefore dead code until they are filled in.
 *
 * That is the point. Nobody has yet observed what Supabase actually returns
 * when a project exceeds its storage quota, and guessing is genuinely
 * dangerous here: a matcher that accidentally catches a network blip, an RLS
 * denial or a duplicate-path conflict would respond to a transient error by
 * permanently deleting 50 other people's photos — and would look like it
 * worked. Default-deny is the only safe posture for an unverified signal.
 *
 * To fill it in: reproduce quota exhaustion on dev, read the
 * `[storage] proof photo upload failed` line that src/lib/db/photos.ts logs
 * (it prints name/status/statusCode/code), and add the observed values here
 * with a comment recording where they came from.
 *
 * Matches on `code`/`status` only, never on `message` — Supabase rewords
 * messages freely, which is why src/lib/auth.ts's `toErrorKey` has the same
 * rule.
 */
const QUOTA_ERROR_CODES: readonly string[] = [];
const QUOTA_ERROR_STATUSES: readonly number[] = [];

export function isStorageQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code =
    'code' in error ? String((error as { code: unknown }).code) : '';
  if (code && QUOTA_ERROR_CODES.includes(code)) return true;

  const status =
    'status' in error
      ? Number((error as { status: unknown }).status)
      : 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 0;

  return status !== 0 && QUOTA_ERROR_STATUSES.includes(status);
}
