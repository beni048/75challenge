'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PASSWORD_MIN_LENGTH, isPasswordLongEnough } from '@/lib/password';
import { updatePassword, hasSupabaseSession } from '@/lib/auth';

/**
 * Landing page for the emailed password-reset link.
 *
 * Supabase turns the recovery token in the URL fragment into a session, so the
 * email is already verified by the time this renders — all that is left is
 * choosing the new password.
 */
export default function ResetPasswordPage() {
  const { t } = useI18n();

  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The client parses the recovery fragment asynchronously; poll briefly
    // rather than declaring the link invalid on the first miss.
    const check = async (attempt = 0) => {
      const ok = await hasSupabaseSession();
      if (cancelled) return;

      if (ok) {
        setRecoveryReady(true);
        setChecking(false);
      } else if (attempt < 5) {
        setTimeout(() => check(attempt + 1), 300);
      } else {
        setChecking(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordLongEnough(password)) {
      setError(t('auth.passwordShort', { min: PASSWORD_MIN_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset.mismatch'));
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      setError(t(result.errorKey ?? 'auth.failed', result.errorVars));
      return;
    }
    setDone(true);
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '460px' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{t('reset.title')}</h1>

        {checking ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>…</p>
        ) : done ? (
          <>
            <div className="notice notice-success" style={{ margin: '1rem 0' }} role="status">
              <CheckCircle2 size={18} />
              <span>{t('reset.success')}</span>
            </div>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
              {t('reset.backToLogin')}
            </Link>
          </>
        ) : !recoveryReady ? (
          <>
            <div className="notice notice-error" style={{ margin: '1rem 0' }} role="alert">
              <AlertCircle size={18} />
              <span>{t('reset.invalidLink')}</span>
            </div>
            <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
              {t('reset.backToLogin')}
            </Link>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              {t('reset.desc')}
            </p>

            {error && (
              <div className="notice notice-error" style={{ marginBottom: '1rem' }} role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="reset-password">
                  {t('reset.newPassword', { min: PASSWORD_MIN_LENGTH })}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password"
                    type="password"
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="reset-password-confirm">
                  {t('reset.confirmPassword')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password-confirm"
                    type="password"
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? t('reset.submitting') : t('reset.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
