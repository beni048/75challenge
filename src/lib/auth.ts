'use client';

/**
 * Credential handling via Supabase Auth.
 *
 * The challenge data itself lives in localStorage (see `src/lib/session.ts`);
 * Supabase is used only for the account: sign-up, sign-in, changing a password
 * while signed in, and the email-verified password reset.
 *
 * Every call degrades gracefully: if Supabase is unreachable or not configured,
 * `ok` comes back false with a human-readable `message` instead of throwing, so
 * the surrounding UI can still let someone use the app locally.
 */

import { createClient } from './supabase/client';

export interface AuthResult {
  ok: boolean;
  message?: string;
  /** True when a Supabase session exists (needed for in-app password changes). */
  hasSession?: boolean;
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unexpected error. Please try again.';
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
      },
    });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true, hasSession: Boolean(data.session) };
  } catch (error) {
    return { ok: false, message: describe(error) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true, hasSession: Boolean(data.session) };
  } catch (error) {
    return { ok: false, message: describe(error) };
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Signing out locally is what matters; ignore transport failures.
  }
}

/**
 * Sends the email-verified password reset link. The recipient lands on
 * /reset-password with a recovery session and can then set a new password.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: describe(error) };
  }
}

/**
 * Changes the password of the currently signed-in account.
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: describe(error) };
  }
}

export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}
