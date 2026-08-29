'use client';

/**
 * Proof-photo uploads.
 *
 * Images are compressed to WebP (< 200 KB) in the browser before they get here
 * — see src/lib/image-compressor.ts — because the free Storage tier is 1 GB.
 *
 * Objects live under "<user-id>/<uuid>.webp". That first path segment is what
 * the storage RLS policy checks, so it must stay the uploader's id.
 */

import { createClient } from '../supabase/client';
import { DbResult, ok, fail } from './types';

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
    const path = `${userId}/${crypto.randomUUID()}.webp`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000', // Immutable: the filename is unique per upload.
      upsert: false,
    });

    if (error) return fail(error);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return ok(data.publicUrl);
  } catch (error) {
    return fail(error);
  }
}
