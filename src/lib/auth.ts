'use client';

/**
 * Credential handling via Supabase Auth.
 *
 * This module owns credentials only — sign-up, sign-in, changing a password
 * while signed in, and the email-verified password reset. The challenge itself
 * lives in the database (see `src/lib/db/`), keyed by the auth user's id.
 *
 * Supabase returns English-only error strings, so nothing from the API is shown
 * to the user directly. Its stable `error_code` values are mapped to our own
 * translation keys, which keeps every failure bilingual (start.md §11).
 */

import { createClient } from './supabase/client';
import { getSupabaseConfig } from './supabase/config';
import { PASSWORD_MIN_LENGTH } from './password';
import type { TranslationKey } from './i18n';

export interface AuthResult {
  ok: boolean;
  /** Translation key for the failure; render with `t(errorKey, errorVars)`. */
  errorKey?: TranslationKey;
  errorVars?: Record<string, string | number>;
  /** True when a Supabase session exists (needed for in-app password changes). */
  hasSession?: boolean;
  /** The auth user id, which is also the challenge's primary key. */
  userId?: string;
  /**
   * True when sign-up succeeded but the project requires email confirmation, so
   * there is no session yet. The caller must route to a "check your inbox" state
   * rather than into the app.
   */
  needsEmailConfirmation?: boolean;
}

/**
 * Maps a Supabase auth error onto one of our translation keys.
 *
 * Matching is on `error_code` (stable) with a status-code fallback, never on
 * the human-readable message, which Supabase is free to reword.
 */
function toErrorKey(error: unknown): { key: TranslationKey; vars?: Record<string, string | number> } {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 0;

  switch (code) {
    case 'weak_password':
      return { key: 'auth.err.weakPassword', vars: { min: PASSWORD_MIN_LENGTH } };
    case 'user_already_exists':
    case 'email_exists':
      return { key: 'auth.err.emailExists' };
    case 'email_not_confirmed':
      return { key: 'auth.err.emailNotConfirmed' };
    case 'invalid_credentials':
      return { key: 'auth.err.invalidCredentials' };
    case 'email_address_invalid':
    case 'validation_failed':
      return { key: 'auth.err.invalidEmail' };
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return { key: 'auth.err.rateLimited' };
    case 'signup_disabled':
      return { key: 'auth.err.signupDisabled' };
  }

  if (status === 429) return { key: 'auth.err.rateLimited' };
  if (status === 400 || status === 401) return { key: 'auth.err.invalidCredentials' };

  // Log the original so a failure we have not mapped yet is still debuggable.
  console.error('[auth] unmapped error', error);
  return { key: 'auth.failed' };
}

function failure(error: unknown): AuthResult {
  const { key, vars } = toErrorKey(error);
  return { ok: false, errorKey: key, errorVars: vars };
}

/** Guard so a missing env var surfaces as advice rather than a network error. */
function configError(): AuthResult | null {
  if (getSupabaseConfig().isConfigured) return null;
  return { ok: false, errorKey: 'auth.err.notConfigured' };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const misconfigured = configError();
  if (misconfigured) return misconfigured;

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

    if (error) return failure(error);

    // Supabase returns a user with no session when confirmation is required.
    // It also returns a user with an empty identities array when the address is
    // already registered, rather than erroring — treating that as success would
    // silently strand someone on a "check your inbox" screen forever.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { ok: false, errorKey: 'auth.err.emailExists' };
    }

    return {
      ok: true,
      hasSession: Boolean(data.session),
      userId: data.user?.id,
      needsEmailConfirmation: Boolean(data.user) && !data.session,
    };
  } catch (error) {
    console.error('[auth] signUp threw', error);
    return { ok: false, errorKey: 'auth.err.network' };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const misconfigured = configError();
  if (misconfigured) return misconfigured;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return failure(error);
    return { ok: true, hasSession: Boolean(data.session), userId: data.user?.id };
  } catch (error) {
    console.error('[auth] signIn threw', error);
    return { ok: false, errorKey: 'auth.err.network' };
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

/** Resends the sign-up confirmation email. */
export async function resendConfirmation(email: string): Promise<AuthResult> {
  const misconfigured = configError();
  if (misconfigured) return misconfigured;

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) return failure(error);
    return { ok: true };
  } catch (error) {
    console.error('[auth] resendConfirmation threw', error);
    return { ok: false, errorKey: 'auth.err.network' };
  }
}

/**
 * Sends the email-verified password reset link. The recipient lands on
 * /reset-password with a recovery session and can then set a new password.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const misconfigured = configError();
  if (misconfigured) return misconfigured;

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    if (error) return failure(error);
    return { ok: true };
  } catch (error) {
    console.error('[auth] sendPasswordReset threw', error);
    return { ok: false, errorKey: 'auth.err.network' };
  }
}

/** Changes the password of the currently signed-in account. */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const misconfigured = configError();
  if (misconfigured) return misconfigured;

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return failure(error);
    return { ok: true };
  } catch (error) {
    console.error('[auth] updatePassword threw', error);
    return { ok: false, errorKey: 'auth.err.network' };
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
