import { describe, it, expect, vi } from 'vitest';
import { toErrorKey } from '@/lib/auth';

/**
 * Regression coverage for a real bug: an unmapped 400/401 error was labelled
 * "invalid credentials" everywhere, including on sign-up ("email and password
 * do not match an account" — on account *creation*) and on password-reset
 * requests, which never even collect a password. The fix scopes that guess to
 * sign-in only; every other context must fall through to a neutral message
 * instead of asserting a specific wrong cause.
 */
describe('toErrorKey', () => {
  const httpError = (status: number, code?: string) => {
    const error = new Error('some message') as Error & { status: number; code?: string };
    error.status = status;
    if (code) error.code = code;
    return error;
  };

  it('guesses invalid credentials for an unmapped 400/401 ONLY on sign-in', () => {
    expect(toErrorKey(httpError(400), 'signin').key).toBe('auth.err.invalidCredentials');
    expect(toErrorKey(httpError(401), 'signin').key).toBe('auth.err.invalidCredentials');
  });

  it('never guesses invalid credentials on sign-up, reset, resend, or update', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const context of ['signup', 'reset', 'resend', 'update'] as const) {
      for (const status of [400, 401]) {
        const result = toErrorKey(httpError(status), context);
        expect(result.key, `${context} @ ${status}`).not.toBe('auth.err.invalidCredentials');
        expect(result.key, `${context} @ ${status}`).toBe('auth.failed');
      }
    }
    consoleSpy.mockRestore();
  });

  it('maps known error codes the same regardless of context', () => {
    for (const context of ['signin', 'signup', 'reset', 'resend', 'update'] as const) {
      expect(toErrorKey(httpError(422, 'weak_password'), context).key).toBe(
        'auth.err.weakPassword'
      );
      expect(toErrorKey(httpError(422, 'user_already_exists'), context).key).toBe(
        'auth.err.emailExists'
      );
    }
  });

  it('maps a real invalid_credentials code on sign-in specifically', () => {
    expect(toErrorKey(httpError(400, 'invalid_credentials'), 'signin').key).toBe(
      'auth.err.invalidCredentials'
    );
  });

  it('maps a rate-limit code the same in every context', () => {
    for (const context of ['signin', 'signup', 'reset', 'resend', 'update'] as const) {
      expect(toErrorKey(httpError(429, 'over_email_send_rate_limit'), context).key).toBe(
        'auth.err.rateLimited'
      );
    }
  });

  it('falls back to a generic failure for a truly unknown error, without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(toErrorKey({}, 'signup').key).toBe('auth.failed');
    expect(toErrorKey(null, 'reset').key).toBe('auth.failed');
    consoleSpy.mockRestore();
  });
});
