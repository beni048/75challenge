/**
 * Password policy — the single source of truth.
 *
 * This MUST match the Supabase project's own minimum. Supabase enforces its
 * limit server-side and rejects anything shorter with a 422 `weak_password`,
 * so if the UI advertises a smaller number the form happily submits a password
 * the API then refuses and no account is ever created.
 *
 * That is exactly what happened: the UI said 5, Supabase required 6, and
 * sign-up silently failed. Keep this constant and the project setting in step,
 * and interpolate it into copy rather than writing the digit into a sentence.
 */
export const PASSWORD_MIN_LENGTH = 6;

/** True when the password satisfies the policy. */
export function isPasswordLongEnough(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}
