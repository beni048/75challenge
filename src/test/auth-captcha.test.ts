import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const authSource = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf8');

/**
 * Supabase's CAPTCHA setting (Authentication → Attack Protection) guards EVERY
 * unauthenticated auth endpoint, not just sign-up. Shipping it wired into
 * signUp alone took down login and password reset on both environments with
 * `captcha_failed: no captcha_token found` — sign-up kept working, which made
 * it look like a login bug rather than a captcha one.
 *
 * These are the calls that go through a guarded endpoint. Each must be able to
 * carry a token.
 */
const GUARDED_CALLS = [
  'signUp',
  'signInWithPassword',
  'resetPasswordForEmail',
  'resend',
];

describe('every captcha-guarded auth call can carry a token', () => {
  it.each(GUARDED_CALLS)('%s passes captchaToken', (call) => {
    const at = authSource.indexOf(`supabase.auth.${call}(`);
    expect(at, `supabase.auth.${call}( not found in auth.ts`).toBeGreaterThan(-1);

    // The token must appear inside this call's own argument list, not merely
    // somewhere else in the file.
    const nextCall = GUARDED_CALLS.map((c) => authSource.indexOf(`supabase.auth.${c}(`, at + 1))
      .filter((i) => i > -1);
    const end = nextCall.length ? Math.min(...nextCall) : authSource.length;
    expect(authSource.slice(at, end)).toContain('captchaToken');
  });

  it('updateUser is NOT expected to carry one — it is authenticated', () => {
    // Documents the boundary: adding a widget there would be pointless UI.
    expect(authSource).toContain('supabase.auth.updateUser({ password: newPassword })');
  });
});
