/**
 * Service-role Supabase client. **Server-side only.**
 *
 * This key bypasses RLS entirely — it can read and delete anything belonging
 * to anyone. It is the only credential in the app that is not scoped to a
 * single user, so:
 *
 *  - it is read from `SUPABASE_SERVICE_ROLE_KEY`, deliberately WITHOUT a
 *    `NEXT_PUBLIC_` prefix, so Next.js will not inline it into a browser
 *    bundle;
 *  - this module has no `'use client'` and must never be imported from a
 *    component. The runtime guard below turns a mistake into a loud crash
 *    rather than a leaked key;
 *  - a missing key returns null so the caller can fail closed with a 503.
 *    Never fall back to the anon key: the caller would then silently do
 *    nothing (RLS would hide every row) while reporting success.
 *
 * Uses `createClient` from `@supabase/supabase-js` rather than
 * `@supabase/ssr` — there is no user session to carry, and persisting one
 * here would be wrong.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from './config';

export function createAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() was called in the browser — the service-role key must never reach the client.');
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    console.error(
      '[storage] SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set. ' +
        'Storage cleanup is disabled until it is added to the deployment environment.'
    );
    return null;
  }

  return createClient(normalizeSupabaseUrl(rawUrl), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
