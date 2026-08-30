'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { signIn, sendPasswordReset } from '@/lib/auth';
import { useToast } from '@/components/Toast';

type Mode = 'login' | 'forgot';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error(t('login.needBoth'));
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      toast.error(t(result.errorKey ?? 'login.failed', result.errorVars));
      return;
    }

    // ChallengeProvider picks up the new session and loads (or creates) the
    // challenge; the home page then renders the feed. Sending everyone to "/"
    // keeps this page from having to know which of those happened.
    router.push('/');
    router.refresh();
  };

  const handleForgot = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t('forgot.needEmail'));
      return;
    }

    setLoading(true);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);

    if (!result.ok) {
      toast.error(t(result.errorKey ?? 'auth.failed', result.errorVars));
      return;
    }
    toast.success(t('forgot.sent', { email: email.trim() }));
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
              onClick={() => setMode('forgot')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', font: 'inherit' }}
            >
              {t('login.forgot')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
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
