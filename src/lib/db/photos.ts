'use client';

/**
 * Proof-photo uploads.
 *
 * Images are downscaled and re-encoded in the browser before they get here —
 * see src/lib/image-compressor.ts, which owns the size/dimension budget —
 * because the free Storage tier is 1 GB and every participant shares it.
 *
 * Objects live under "<user-id>/<uuid>.<ext>". That first path segment is what
 * the storage RLS policy checks, so it must stay the uploader's id — and it is
 * also what the cleanup job parses back out of a stored public URL.
 */

import { createClient } from '../supabase/client';
import { DbResult, ok, fail } from './types';
import {
  CLIENT_CHECK_COOLDOWN_HOURS,
  STORAGE_CHECK_STORAGE_KEY,
} from '../storage-quota';

const BUCKET = 'proof-photos';

/**
 * Uploads a compressed photo and returns its durable public URL.
 *
 * This is the URL that gets persisted on the log. A `blob:` preview URL must
 * never be stored — it dies with the page and renders as a broken image after
 * the next reload.
 */
export async function uploadProofPhoto(userId: string, blob: Blob): Promise<DbResult<string>> {
  try {
    const supabase = createClient();
    // The compressor falls back to JPEG where WebP encoding is unavailable, so
    // the extension and content type follow the blob rather than being assumed.
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/webp',
      cacheControl: '31536000', // Immutable: the filename is unique per upload.
      upsert: false,
    });

    if (error) {
      // Log the fields, not the object: Supabase errors often print as {} once
      // minified (same reasoning as [auth] in src/lib/auth.ts). This is also
      // the instrumentation that will reveal the real shape of a
      // quota-exhausted error — see isStorageQuotaError below.
      console.error('[storage] proof photo upload failed', {
        name: (error as { name?: unknown }).name,
        status: (error as { status?: unknown }).status,
        statusCode: (error as { statusCode?: unknown }).statusCode,
        code: (error as { code?: unknown }).code,
      });
      return fail(error);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Housekeeping, after the upload has already succeeded so it can never
    // delay or fail the check-in itself.
    requestStorageCleanupCheck();
    return ok(data.publicUrl);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Asks the server to check storage usage, at most once every
 * CLIENT_CHECK_COOLDOWN_HOURS per device.
 *
 * Fire-and-forget by design: never awaited, never blocks the check-in, and
 * never toasts. The participant just logged their day — "storage cleanup
 * failed" would be both meaningless and alarming to them. The endpoint is a
 * no-op below the threshold, so the common case costs one cheap request.
 *
 * Hooked to uploads rather than logins because uploads are the only action
 * that grows the bucket, so this tracks the thing it is guarding. The
 * localStorage throttle is advisory — the authoritative cooldown is the
 * server-side claim in migration 0005.
 */
export function requestStorageCleanupCheck(): void {
  try {
    const last = Number(window.localStorage.getItem(STORAGE_CHECK_STORAGE_KEY) ?? 0);
    const elapsedHours = (Date.now() - last) / 3_600_000;
    if (Number.isFinite(last) && elapsedHours < CLIENT_CHECK_COOLDOWN_HOURS) return;
    window.localStorage.setItem(STORAGE_CHECK_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage blocked — fall through and just make the request.
  }

  void fetch('/api/cleanup-storage', { method: 'POST', keepalive: true }).catch(() => {
    // Deliberately silent: this is background housekeeping, not the user's
    // problem, and the nightly cron is the primary trigger anyway.
  });
}
