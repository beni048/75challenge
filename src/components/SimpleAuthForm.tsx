'use client';

import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface SimpleAuthFormProps {
  initialDisplayName?: string;
  initialEmail?: string;
  onSubmit: (data: { displayName: string; email: string; password: string }) => Promise<void>;
  submitButtonText?: string;
  loading?: boolean;
}

export default function SimpleAuthForm({
  initialDisplayName = '',
  initialEmail = '',
  onSubmit,
  submitButtonText,
  loading = false,
}: SimpleAuthFormProps) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError(t('auth.nameRequired'));
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError(t('auth.emailInvalid'));
      return;
    }

    // Lenient password policy: minimum 5 characters.
    if (password.length < 5) {
      setError(t('auth.passwordShort'));
      return;
    }

    try {
      await onSubmit({ displayName: displayName.trim(), email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} id="auth-form">
      {error && (
        <div className="notice notice-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="input-group">
        <label className="input-label" htmlFor="auth-display-name">
          {t('auth.nameLabel')}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-display-name"
            type="text"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder={t('auth.namePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            required
          />
          <UserIcon
            size={18}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-email">
          {t('auth.emailLabel')}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-email"
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

      <div className="input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label className="input-label" htmlFor="auth-password">
            {t('auth.passwordLabel')}
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auth.passwordHint')}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-password"
            type="password"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={5}
          />
          <Lock
            size={18}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '0.5rem' }}
        disabled={loading}
        id="auth-submit-btn"
      >
        {loading ? t('auth.submitting') : (submitButtonText ?? t('auth.submitDefault'))}
        {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
