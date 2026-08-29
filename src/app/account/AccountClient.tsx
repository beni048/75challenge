'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RuleCustomizer from '@/components/RuleCustomizer';
import { Rule } from '@/lib/streak-engine';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import { useToast, ConfirmDialog } from '@/components/Toast';
import { replaceRules, updateProfile, restartChallenge } from '@/lib/db/profile';
import { signOut, updatePassword, sendPasswordReset } from '@/lib/auth';
import { Lock, ArrowRight, LogOut, RotateCcw } from 'lucide-react';

type Tab = 'rules' | 'profile' | 'security';

const TABS: Tab[] = ['rules', 'profile', 'security'];

function isTab(value: string | null): value is Tab {
  return value === 'rules' || value === 'profile' || value === 'security';
}

export default function AccountClient() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { session, challenge, loading, refresh } = useChallenge();

  // The active tab is derived from the URL, not copied into state. Copying it
  // meant that navigating from the header to ?tab=security while already on
  // /account changed the URL but left the old tab showing.
  const requestedTab = searchParams.get('tab');
  const tab: Tab = isTab(requestedTab) ? requestedTab : 'rules';

  const selectTab = (value: Tab) => {
    router.replace(`/account?tab=${value}`, { scroll: false });
  };

  // Form drafts stay null until the user actually edits a field, so the stored
  // challenge shows through without copying it into state on mount.
  const [editedRules, setEditedRules] = useState<Rule[] | null>(null);
  const [editedName, setEditedName] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (loading) return <div style={{ minHeight: '60vh' }} />;

  if (!session || !challenge) {
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

  const draftRules =
    editedRules ??
    challenge.rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      schedule_type: rule.schedule_type,
      custom_days: rule.custom_days,
    }));
  const displayName = editedName ?? challenge.displayName;

  const handleSaveRules = async () => {
    if (draftRules.length < 2) {
      toast.error(t('rules.minWarning'));
      return;
    }

    setBusy(true);
    const result = await replaceRules(challenge.id, draftRules);
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEditedRules(null);
    await refresh();
    toast.success(t('account.rulesSaved'));
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error(t('auth.nameRequired'));
      return;
    }

    setBusy(true);
    const result = await updateProfile(challenge.id, { displayName: displayName.trim() });
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEditedName(null);
    await refresh();
    toast.success(t('account.profileSaved'));
  };

  const handleUpdatePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 5) {
      toast.error(t('auth.passwordShort'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('reset.mismatch'));
      return;
    }

    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (!result.ok) {
      toast.error(result.message ?? t('auth.failed'));
      return;
    }
    setPassword('');
    setConfirmPassword('');
    toast.success(t('account.updated'));
  };

  const handleSendReset = async () => {
    const email = session.user.email;
    if (!email) return;

    const result = await sendPasswordReset(email);
    if (!result.ok) {
      toast.error(result.message ?? t('auth.failed'));
      return;
    }
    toast.success(t('account.resetSent', { email }));
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleRestart = async () => {
    setConfirmRestart(false);
    setBusy(true);
    const result = await restartChallenge(challenge.id);
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    await refresh();
    toast.info(t('profile.resetAlert'));
  };

  const tabLabel = (value: Tab) =>
    value === 'rules'
      ? t('account.tabRules')
      : value === 'profile'
        ? t('account.tabProfile')
        : t('account.tabSecurity');

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
            onClick={() => selectTab(value)}
            aria-current={tab === value ? 'page' : undefined}
            className={`btn btn-sm ${tab === value ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tabLabel(value)}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <RuleCustomizer rules={draftRules} onChange={setEditedRules} />
          <button
            onClick={handleSaveRules}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            disabled={busy}
          >
            {busy ? t('common.saving') : t('account.saveRules')}
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
            <input id="account-username" type="text" className="input-field" value={challenge.username} readOnly disabled />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="account-email">
              {t('account.email')}
            </label>
            {/* Email belongs to the auth account, not the challenge, and
                changing it needs its own verification flow — read-only here. */}
            <input
              id="account-email"
              type="email"
              className="input-field"
              value={session.user.email ?? ''}
              readOnly
              disabled
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleSaveProfile} className="btn btn-primary" disabled={busy}>
              {busy ? t('common.saving') : t('account.saveProfile')}
            </button>
            <Link href={`/user/${challenge.username}`} className="btn btn-secondary">
              {t('account.goToChallenge')}
            </Link>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{t('account.changePassword')}</h3>

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
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? t('reset.submitting') : t('account.updateSubmit')}
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
              <button onClick={() => setConfirmRestart(true)} className="btn btn-danger" disabled={busy}>
                <RotateCcw size={16} /> {t('account.dangerCta')}
              </button>
              <button onClick={handleLogout} className="btn btn-secondary">
                <LogOut size={16} /> {t('account.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRestart}
        title={t('account.dangerTitle')}
        body={t('account.dangerConfirm')}
        confirmLabel={t('account.dangerCta')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleRestart}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  );
}
