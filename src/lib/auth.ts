'use client';

/**
 * Credential handling via Supabase Auth.
 *
 * This module owns credentials only — sign-up, sign-in, changing a password
 * while signed in, and the email-verified password reset. The challenge itself
 * lives in the database (see `src/lib/db/`), keyed by the auth user's id.
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
  /** The auth user id, which is also the challenge's primary key. */
  userId?: string;
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
        // Confirming a sign-up email should land on the app, not on the
        // password-reset screen.
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true, hasSession: Boolean(data.session), userId: data.user?.id };
  } catch (error) {
    return { ok: false, message: describe(error) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: describe(error) };
    return { ok: true, hasSession: Boolean(data.session), userId: data.user?.id };
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
