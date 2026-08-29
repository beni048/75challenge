import { describe, it, expect } from 'vitest';
import { PASSWORD_MIN_LENGTH, isPasswordLongEnough } from '@/lib/password';
import { translations } from '@/lib/i18n';

describe('Password policy', () => {
  it('matches the minimum Supabase enforces server-side', () => {
    // Supabase rejects anything shorter with 422 weak_password:
    // "Password should be at least 6 characters."
    // If the project setting is ever raised, change it here too — a UI that
    // advertises a lower number lets the form submit a password the API
    // refuses, and no account is created.
    expect(PASSWORD_MIN_LENGTH).toBe(6);
  });

  it('rejects a password one character too short', () => {
    expect(isPasswordLongEnough('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it('accepts a password at exactly the minimum', () => {
    expect(isPasswordLongEnough('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
  });

  it('accepts a longer password', () => {
    expect(isPasswordLongEnough('a'.repeat(PASSWORD_MIN_LENGTH + 20))).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(isPasswordLongEnough('')).toBe(false);
  });

  it('never hardcodes the minimum into copy — both locales interpolate it', () => {
    // The 5-vs-6 bug happened because the number lived in a sentence. Every
    // password string must carry {min} so it can never disagree with the code.
    const keys = ['auth.passwordLabel', 'auth.passwordShort', 'reset.newPassword', 'account.newPassword'] as const;

    for (const locale of ['en', 'de'] as const) {
      for (const key of keys) {
        expect(translations[locale][key], `${locale}.${key}`).toContain('{min}');
        expect(translations[locale][key], `${locale}.${key}`).not.toMatch(/\b\d+\b/);
      }
    }
  });
});
