'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RuleCustomizer from '@/components/RuleCustomizer';
import { Rule } from '@/lib/streak-engine';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/components/useSession';
import { clearSession, resetToDayOne } from '@/lib/session';
import { signOut, updatePassword, sendPasswordReset, hasSupabaseSession } from '@/lib/auth';
import { AlertCircle, CheckCircle2, Lock, ArrowRight, LogOut, RotateCcw } from 'lucide-react';

type Tab = 'rules' | 'profile' | 'security';

const TABS: Tab[] = ['rules', 'profile', 'security'];

function isTab(value: string | null): value is Tab {
  return value === 'rules' || value === 'profile' || value === 'security';
}

export default function AccountClient() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready, saveSession } = useSession();

  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : 'rules');

  // Form drafts stay null until the user actually edits a field, so the stored
  // session shows through without copying it into state on mount.
  const [editedRules, setEditedRules] = useState<Rule[] | null>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedEmail, setEditedEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [canChangeInApp, setCanChangeInApp] = useState<boolean | null>(null);

  useEffect(() => {
    hasSupabaseSession().then(setCanChangeInApp);
  }, []);

  if (!ready) return <div style={{ minHeight: '60vh' }} />;

  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>{t('account.notLoggedIn')}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-secondary">
              {t('nav.login')}
            </Link>
            <Link href="/join" className="btn btn-primary">
              {t('nav.join')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const draftRules = editedRules ?? session.rules;
  const displayName = editedName ?? session.display_name;
  const email = editedEmail ?? session.email;

  const flash = (text: string) => {
    setError(null);
    setMessage(text);
  };

  const handleSaveRules = () => {
    if (draftRules.length < 2) {
      setMessage(null);
      setError(t('rules.minWarning'));
      return;
    }
    saveSession({ ...session, rules: draftRules });
    setEditedRules(null);
    flash(t('account.rulesSaved'));
  };

  const handleSaveProfile = () => {
    if (!displayName.trim()) {
      setMessage(null);
      setError(t('auth.nameRequired'));
      return;
    }
    saveSession({ ...session, display_name: displayName.trim(), email: email.trim() });
    setEditedName(null);
    setEditedEmail(null);
    flash(t('account.profileSaved'));
  };

  const handleUpdatePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 5) {
      setError(t('auth.passwordShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset.mismatch'));
      return;
    }

    setSavingPassword(true);
    const result = await updatePassword(password);
    setSavingPassword(false);

    if (!result.ok) {
      setError(result.message || t('auth.failed'));
      return;
    }
    setPassword('');
    setConfirmPassword('');
    flash(t('account.updated'));
  };

  const handleSendReset = async () => {
    setMessage(null);
    setError(null);
    const result = await sendPasswordReset(session.email);
    if (!result.ok) {
      setError(result.message || t('auth.failed'));
      return;
    }
    flash(t('account.resetSent', { email: session.email }));
  };

  const handleLogout = async () => {
    await signOut();
    clearSession();
    router.push('/');
  };

  const handleResetChallenge = () => {
    if (!confirm(t('account.dangerConfirm'))) return;
    saveSession(resetToDayOne(session));
    flash(t('profile.resetAlert'));
  };

  const tabLabel = (value: Tab) =>
    value === 'rules' ? t('account.tabRules') : value === 'profile' ? t('account.tabProfile') : t('account.tabSecurity');

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '740px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{t('account.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('account.subtitle')}</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map((value) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setMessage(null);
              setError(null);
            }}
            className={`btn btn-sm ${tab === value ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tabLabel(value)}
          </button>
        ))}
      </div>

      {message && (
        <div className="notice notice-success" style={{ marginBottom: '1rem' }} role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="notice notice-error" style={{ marginBottom: '1rem' }} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {tab === 'rules' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <RuleCustomizer rules={draftRules} onChange={setEditedRules} />
          <button onClick={handleSaveRules} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {t('account.saveRules')}
          </button>
        </div>
      )}

      {tab === 'profile' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="account-display-name">
              {t('account.displayName')}
            </label>
            <input
              id="account-display-name"
              type="text"
              className="input-field"
              value={displayName}
              onChange={(e) => setEditedName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="account-username">
              {t('account.username')}
            </label>
            <input id="account-username" type="text" className="input-field" value={session.username} readOnly disabled />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="account-email">
              {t('account.email')}
            </label>
            <input
              id="account-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEditedEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleSaveProfile} className="btn btn-primary">
              {t('account.saveProfile')}
            </button>
            <Link href={`/user/${session.username}`} className="btn btn-secondary">
              {t('account.goToChallenge')}
            </Link>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{t('account.changePassword')}</h3>

            {canChangeInApp === false && (
              <div className="notice notice-info" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={18} />
                <span>{t('account.needSession')}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword}>
              <div className="input-group">
                <label className="input-label" htmlFor="account-new-password">
                  {t('account.newPassword')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="account-new-password"
                    type="password"
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={5}
                  />
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="account-confirm-password">
                  {t('account.confirmPassword')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="account-confirm-password"
                    type="password"
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={5}
                  />
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? t('reset.submitting') : t('account.updateSubmit')}
                </button>
                <button type="button" onClick={handleSendReset} className="btn btn-secondary">
                  {t('account.sendReset')}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{t('account.dangerTitle')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('account.dangerDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleResetChallenge} className="btn btn-danger">
                <RotateCcw size={16} /> {t('account.dangerCta')}
              </button>
              <button onClick={handleLogout} className="btn btn-secondary">
                <LogOut size={16} /> {t('account.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
