'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { signIn, sendPasswordReset } from '@/lib/auth';
import { loadSession } from '@/lib/session';

type Mode = 'login' | 'forgot';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError(t('login.needBoth'));
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message || t('login.failed'));
      return;
    }

    // The challenge itself lives on this device. If it is here, go straight to
    // it; otherwise the account has no local challenge yet and needs onboarding.
    const session = loadSession();
    router.push(session ? `/user/${session.username}` : '/join');
  };

  const handleForgot = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError(t('forgot.needEmail'));
      return;
    }

    setLoading(true);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);

    if (!result.ok) {
      setError(result.message || t('auth.failed'));
      return;
    }
    setNotice(t('forgot.sent', { email: email.trim() }));
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '460px' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
          {mode === 'login' ? t('login.title') : t('forgot.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          {mode === 'login' ? t('login.subtitle') : t('forgot.desc')}
        </p>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: '1rem' }} role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="notice notice-success" style={{ marginBottom: '1rem' }} role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleForgot}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">
              {t('login.emailLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-email"
                type="email"
                className="input-field"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Mail
                size={18}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          {mode === 'login' && (
            <div className="input-group">
              <label className="input-label" htmlFor="login-password">
                {t('login.passwordLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type="password"
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {mode === 'login'
              ? loading
                ? t('login.submitting')
                : t('login.submit')
              : loading
                ? t('forgot.submitting')
                : t('forgot.submit')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError(null);
                setNotice(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', font: 'inherit' }}
            >
              {t('login.forgot')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setNotice(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <ArrowLeft size={14} /> {t('forgot.back')}
            </button>
          )}
        </div>
      </div>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        {t('login.noAccount')}{' '}
        <Link href="/join" style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
          {t('login.joinLink')}
        </Link>
      </p>
    </div>
  );
}
