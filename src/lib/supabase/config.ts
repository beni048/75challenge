/**
 * Shared Supabase connection settings.
 *
 * Both the browser and server clients read their URL/key from here so the same
 * validation applies everywhere.
 */

/**
 * Normalizes the configured project URL.
 *
 * The Supabase client appends its own service paths (`/auth/v1/...`,
 * `/rest/v1/...`), so it must be given the bare project origin. Pasting the REST
 * endpoint from the dashboard instead produces requests like
 * `/rest/v1/auth/v1/token`, which the API rejects with the unhelpful
 * "Invalid path specified in request URL". Stripping the path here turns that
 * whole class of copy-paste mistake into a no-op.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).origin;
  } catch {
    // Not a parseable URL — hand it back untouched so the caller's own
    // validation reports it.
    return rawUrl;
  }
}

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  /** False when the env vars are missing, so callers can degrade gracefully. */
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    // The app is usable without a backend (the challenge itself is local), so
    // this warns rather than throws — but it must be loud in the console.
    console.warn(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
        'Account features (sign-up, log in, password reset) will not work.'
    );
    return { url: PLACEHOLDER_URL, anonKey: 'placeholder-key', isConfigured: false };
  }

  return { url: normalizeSupabaseUrl(rawUrl), anonKey, isConfigured: true };
}
