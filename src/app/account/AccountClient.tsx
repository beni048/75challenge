'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RuleCustomizer from '@/components/RuleCustomizer';
import { Rule } from '@/lib/streak-engine';
import { useI18n } from '@/lib/i18n';
import { PASSWORD_MIN_LENGTH, isPasswordLongEnough } from '@/lib/password';
import { useChallenge } from '@/components/ChallengeProvider';
import { useToast, ConfirmDialog } from '@/components/Toast';
import { replaceRules, updateProfile, restartChallenge, consumeRulesChange } from '@/lib/db/profile';
import { uploadAvatar } from '@/lib/db/avatar';
import { compressImageToWebP } from '@/lib/image-compressor';
import { MIN_RULES } from '@/lib/rules-policy';
import { getRulesChangeState } from '@/lib/rules-window';
import { getEffectiveLogDate, getSupportedTimezones } from '@/lib/date-utils';
import { signOut, updatePassword, sendPasswordReset } from '@/lib/auth';
import { Lock, ArrowRight, LogOut, RotateCcw, Info, CheckCircle2, Upload } from 'lucide-react';
import Avatar from '@/components/Avatar';
import InfoTooltip from '@/components/InfoTooltip';

const TIMEZONE_OPTIONS: string[] = (() => {
  const supported = getSupportedTimezones();
  return supported.length > 0 ? supported : ['UTC'];
})();

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
  const [editedLocation, setEditedLocation] = useState<string | null>(null);
  const [editedTimezone, setEditedTimezone] = useState<string | null>(null);
  const [editedSecretVisibility, setEditedSecretVisibility] = useState<'placeholder' | 'hidden' | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [announceRestart, setAnnounceRestart] = useState(false);
  const [confirmRulesChange, setConfirmRulesChange] = useState(false);

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
  const locationValue = editedLocation ?? challenge.location ?? '';
  const timezoneValue = editedTimezone ?? challenge.timezone;
  const secretVisibilityValue = editedSecretVisibility ?? challenge.secretRulesVisibility;

  // One adjustment per attempt, from day 8. The database enforces this too;
  // this is what lets the UI explain the state instead of just failing.
  const rulesChange = getRulesChangeState(
    challenge.startDate,
    challenge.rulesChangedAt,
    getEffectiveLogDate(challenge.timezone)
  );
  const canEditRules = rulesChange.status === 'available';

  const handleSaveRules = async () => {
    if (draftRules.length < MIN_RULES) {
      toast.error(t('rules.minWarning', { min: MIN_RULES }));
      return;
    }
    setConfirmRulesChange(true);
  };

  const handleConfirmSaveRules = async () => {
    setConfirmRulesChange(false);
    setBusy(true);

    const result = await replaceRules(challenge.id, draftRules);
    if (result.error) {
      setBusy(false);
      toast.error(result.error);
      return;
    }

    // Spend the allowance only after the rules actually landed.
    const consumed = await consumeRulesChange();
    setBusy(false);

    if (consumed.error) {
      toast.error(consumed.error);
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
    const result = await updateProfile(challenge.id, {
      displayName: displayName.trim(),
      location: locationValue.trim() || null,
      timezone: timezoneValue,
      secretRulesVisibility: secretVisibilityValue,
    });
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEditedName(null);
    setEditedLocation(null);
    setEditedTimezone(null);
    setEditedSecretVisibility(null);
    await refresh();
    toast.success(t('account.profileSaved'));
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const compressed = await compressImageToWebP(file, 400, 400, 0.82);
      URL.revokeObjectURL(compressed.previewUrl);
      const uploaded = await uploadAvatar(challenge.id, compressed.blob);
      if (uploaded.error) {
        toast.error(uploaded.error);
        return;
      }
      const updated = await updateProfile(challenge.id, { avatarUrl: uploaded.data });
      if (updated.error) {
        toast.error(updated.error);
        return;
      }
      await refresh();
      toast.success(t('account.profileSaved'));
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(t('auth.failed'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleUpdatePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isPasswordLongEnough(password)) {
      toast.error(t('auth.passwordShort', { min: PASSWORD_MIN_LENGTH }));
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
      toast.error(t(result.errorKey ?? 'auth.failed', result.errorVars));
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
      toast.error(t(result.errorKey ?? 'auth.failed', result.errorVars));
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
    const result = await restartChallenge(challenge.id, challenge.timezone, announceRestart);
    setAnnounceRestart(false);
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
        <div className="glass-card stack" style={{ padding: '1.25rem' }}>
          {/* State of the one-time change, explained before the controls. */}
          {rulesChange.status === 'locked' && (
            <div className="notice notice-info">
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>{t('account.rulesLockedTitle')}</strong>{' '}
                {t('account.rulesLockedBody', {
                  current: rulesChange.currentDay,
                  unlocksOn: rulesChange.unlocksOnDay,
                })}
              </span>
            </div>
          )}

          {rulesChange.status === 'used' && (
            <div className="notice notice-info">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>{t('account.rulesUsedTitle')}</strong> {t('account.rulesUsedBody')}
              </span>
            </div>
          )}

          {canEditRules && (
            <div className="notice notice-warn">
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>{t('account.rulesAvailableTitle')}</strong> {t('account.rulesAvailableBody')}
              </span>
            </div>
          )}

          {canEditRules ? (
            <>
              <RuleCustomizer rules={draftRules} onChange={setEditedRules} />
              <button
                onClick={handleSaveRules}
                className="btn btn-primary btn-block"
                disabled={busy}
              >
                {busy ? t('common.saving') : t('account.saveRules')}
              </button>
            </>
          ) : (
            // Outside the window the habits are shown read-only.
            <ul className="stack stack-tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {draftRules.map((rule, idx) => (
                <li key={rule.id} className="rule-row">
                  <div className="rule-row-head">
                    <span className="rule-index" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{rule.title}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div className="input-group" style={{ alignItems: 'center' }}>
            <label className="input-label">{t('auth.avatarLabel')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  flexShrink: 0,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--gradient-fire)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: 'var(--text-on-accent)',
                  overflow: 'hidden',
                }}
              >
                <Avatar url={challenge.avatarUrl} displayName={displayName} username={challenge.username} />
              </div>

              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload size={16} />
                <span>{challenge.avatarUrl ? t('auth.avatarChange') : t('auth.avatarUpload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </label>

              {uploadingAvatar && (
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-orange)' }}>{t('checklist.compressing')}</span>
              )}
            </div>
          </div>

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

          <div className="input-group">
            <label className="input-label" htmlFor="account-location">
              {t('onboarding.locationLabel')}
            </label>
            <input
              id="account-location"
              type="text"
              className="input-field"
              placeholder={t('onboarding.locationPlaceholder')}
              value={locationValue}
              onChange={(e) => setEditedLocation(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="account-timezone">
              {t('onboarding.timezoneLabel')}
            </label>
            <select
              id="account-timezone"
              className="input-field"
              value={timezoneValue}
              onChange={(e) => setEditedTimezone(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {t('onboarding.timezoneHint')}
            </p>
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {t('account.secretRulesLabel')}
              <InfoTooltip label={t('rules.secretInfoLabel')} text={t('rules.secretInfoText')} />
            </label>
            <div className="stack stack-tight">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="secret-rules-visibility"
                  checked={secretVisibilityValue === 'placeholder'}
                  onChange={() => setEditedSecretVisibility('placeholder')}
                />
                {t('account.secretRulesPlaceholder')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="secret-rules-visibility"
                  checked={secretVisibilityValue === 'hidden'}
                  onChange={() => setEditedSecretVisibility('hidden')}
                />
                {t('account.secretRulesHidden')}
              </label>
            </div>
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
                  {t('account.newPassword', { min: PASSWORD_MIN_LENGTH })}
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
                    minLength={PASSWORD_MIN_LENGTH}
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
                    minLength={PASSWORD_MIN_LENGTH}
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
        isOpen={confirmRulesChange}
        title={t('account.rulesAvailableTitle')}
        body={t('account.rulesChangeConfirm')}
        confirmLabel={t('account.saveRules')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmSaveRules}
        onCancel={() => setConfirmRulesChange(false)}
      />

      <ConfirmDialog
        isOpen={confirmRestart}
        title={t('account.dangerTitle')}
        body={t('account.dangerConfirm')}
        confirmLabel={t('account.dangerCta')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleRestart}
        onCancel={() => {
          setAnnounceRestart(false);
          setConfirmRestart(false);
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={announceRestart}
            onChange={(e) => setAnnounceRestart(e.target.checked)}
          />
          {t('shield.announceToFeed')}
        </label>
      </ConfirmDialog>
    </div>
  );
}
