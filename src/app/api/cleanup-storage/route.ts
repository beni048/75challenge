/**
 * Storage ceiling guard: reclaims space so the shared 1 GB free-tier bucket
 * never fills, which would otherwise break proof-photo uploads for everyone at
 * once.
 *
 * This is a destructive endpoint holding the service-role key, so it is
 * defended in layers — and note that the auth check is NOT the most important
 * one:
 *
 *  1. It accepts no user-controlled target. No body, no ids, no bucket, no
 *     count. *What* gets deleted is computed entirely server-side by the SQL
 *     functions in migration 0005. An attacker cannot aim it.
 *  2. It is a no-op below the trigger threshold, so spamming it achieves
 *     literally nothing in the normal case.
 *  3. A server-side atomic claim (claim_storage_cleanup) enforces the cooldown
 *     and doubles as a mutex, so concurrent invocations cannot race on the
 *     same batch. This is the real rate limit; the client-side check is
 *     advisory only.
 *  4. Callers must present either the cron secret or a valid Supabase session.
 *
 * Deletion order is DB-first, then Storage: clearing `photo_url` immediately
 * puts the row into a state the app already handles, and a subsequent Storage
 * failure only leaves an orphan, which the next run reclaims for free. See the
 * header of migration 0005.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  CLEANUP_BATCH_SIZE,
  CLEANUP_COOLDOWN_SECONDS,
  CLEANUP_DEADLINE_MS,
  CLEANUP_MAX_BATCHES_PER_RUN,
  CLEANUP_TARGET_BYTES,
  shouldTriggerCleanup,
} from '@/lib/storage-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const BUCKET = 'proof-photos';

/** Constant-time compare, so the secret can't be recovered by timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * The cron secret, or failing that a real signed-in user.
 *
 * `getUser()`, never `getSession()`: getSession trusts whatever is in the
 * cookie, which a caller can forge. getUser revalidates the JWT against the
 * auth server.
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CLEANUP_CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';

  if (cronSecret && header.startsWith('Bearer ')) {
    if (secretMatches(header.slice('Bearer '.length), cronSecret)) return true;
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Fail closed and loud — never silently degrade to the anon key.
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const startedAt = Date.now();

  try {
    const readUsage = async (): Promise<number> => {
      const { data, error } = await admin.rpc('storage_usage_bytes');
      if (error) throw error;
      return Number(data ?? 0);
    };

    const usedBytes = await readUsage();
    if (!shouldTriggerCleanup(usedBytes)) {
      return NextResponse.json({ ran: false, reason: 'under-threshold', usedBytes });
    }

    // Claim the cooldown/mutex only once there is actually work to do, so a
    // below-threshold poll doesn't consume the window a real run needs.
    const { data: claimed } = await admin.rpc('claim_storage_cleanup', {
      cooldown_seconds: CLEANUP_COOLDOWN_SECONDS,
    });
    if (claimed !== true) {
      return NextResponse.json({ ran: false, reason: 'cooling-down', usedBytes });
    }

    let deleted = 0;
    let currentUsage = usedBytes;
    let stoppedBecause = 'target-reached';

    /** Removes objects from Storage. Returns false to abort the whole run. */
    const removeObjects = async (paths: string[]): Promise<boolean> => {
      const { data, error } = await admin.storage.from(BUCKET).remove(paths);
      if (error) {
        // Aborting matters: if deletes silently stop freeing bytes, usage
        // stays above target forever and the loop would keep nulling rows
        // while reclaiming nothing.
        console.error('[storage] remove() failed, aborting run', { count: paths.length });
        return false;
      }
      // remove() reports what was actually deleted; a shortfall just means
      // some were already gone, which is harmless and idempotent.
      if (data && data.length < paths.length) {
        console.warn('[storage] some objects were already absent', {
          requested: paths.length,
          removed: data.length,
        });
      }
      deleted += paths.length;
      return true;
    };

    // ---- Pass 1: orphans. Referenced by nothing, so this is free to do. ----
    const { data: orphans, error: orphanError } = await admin.rpc('storage_orphan_objects', {
      batch_size: CLEANUP_BATCH_SIZE,
    });
    if (orphanError) throw orphanError;

    const orphanPaths = (orphans ?? []).map((r: { object_path: string }) => r.object_path);
    if (orphanPaths.length > 0) {
      if (!(await removeObjects(orphanPaths))) {
        return NextResponse.json({ ran: true, deleted, reason: 'remove-failed' }, { status: 500 });
      }
      currentUsage = await readUsage();
    }

    // ---- Pass 2: live photos, oldest/abandoned first. ----
    for (let batch = 0; batch < CLEANUP_MAX_BATCHES_PER_RUN; batch++) {
      if (currentUsage <= CLEANUP_TARGET_BYTES) break;
      if (Date.now() - startedAt > CLEANUP_DEADLINE_MS) {
        stoppedBecause = 'deadline';
        break;
      }

      const { data: candidates, error: candidateError } = await admin.rpc(
        'storage_cleanup_candidates',
        { batch_size: CLEANUP_BATCH_SIZE }
      );
      if (candidateError) throw candidateError;

      const rows = (candidates ?? []) as { log_id: string; object_path: string }[];
      if (rows.length === 0) {
        stoppedBecause = 'no-candidates';
        break;
      }

      // Clear the column first and take the paths back from the same
      // statement — see migration 0005 for why this order is the safe one.
      const { data: released, error: releaseError } = await admin.rpc('storage_release_photos', {
        log_ids: rows.map((r) => r.log_id),
      });
      if (releaseError) throw releaseError;

      const paths = ((released ?? []) as { object_path: string }[])
        .map((r) => r.object_path)
        .filter(Boolean);
      if (paths.length === 0) {
        stoppedBecause = 'no-candidates';
        break;
      }

      if (!(await removeObjects(paths))) {
        stoppedBecause = 'remove-failed';
        break;
      }

      // Read real usage rather than estimating: storage.objects updates
      // immediately on delete, and one cheap RPC beats drifting arithmetic.
      currentUsage = await readUsage();
      if (batch === CLEANUP_MAX_BATCHES_PER_RUN - 1) stoppedBecause = 'batch-cap';
    }

    const freedBytes = Math.max(0, usedBytes - currentUsage);
    await admin.rpc('record_storage_cleanup', { deleted, freed_bytes: freedBytes });

    return NextResponse.json({
      ran: true,
      deleted,
      freedBytes,
      usedBytes: currentUsage,
      stoppedBecause,
    });
  } catch (error) {
    // Log the detail; never echo an admin-client error into the response.
    console.error('[storage] cleanup failed', error);
    return NextResponse.json({ error: 'cleanup-failed' }, { status: 500 });
  }
}
