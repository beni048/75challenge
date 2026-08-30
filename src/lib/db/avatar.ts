'use client';

/**
 * Avatar uploads.
 *
 * Mirrors src/lib/db/photos.ts's proof-photo pattern (same
 * "<user-id>/<filename>" convention, same compress-then-upload flow), with
 * two deliberate differences: a stable filename (`avatar.webp`) so re-
 * uploading replaces the old picture instead of accumulating orphaned files,
 * and `upsert: true` for the same reason. Proof photos never overwrite —
 * avatars always should, since there's only ever one "current" picture.
 */

import { createClient } from '../supabase/client';
import { DbResult, ok, fail } from './types';

const BUCKET = 'avatars';

/**
 * Uploads a compressed avatar and returns its durable public URL, cache-busted
 * so a replaced picture shows immediately instead of the browser's cached
 * previous image at the same stable path.
 */
export async function uploadAvatar(userId: string, blob: Blob): Promise<DbResult<string>> {
  try {
    const supabase = createClient();
    // Stable name, so a re-upload replaces rather than accumulates. The
    // extension deliberately does NOT follow blob.type here: varying it would
    // strand the previous file at the old extension instead of overwriting it.
    const path = `${userId}/avatar.webp`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/webp',
      cacheControl: '3600',
      upsert: true,
    });

    if (error) return fail(error);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return ok(`${data.publicUrl}?v=${Date.now()}`);
  } catch (error) {
    return fail(error);
  }
}
