import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

/** Browser-side Supabase client. Used for auth only — see `src/lib/auth.ts`. */
export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
