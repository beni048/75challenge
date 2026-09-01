'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User as UserIcon, AtSign, Upload, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PASSWORD_MIN_LENGTH, isPasswordLongEnough } from '@/lib/password';
import { toUsernameSlug } from '@/lib/db/profile';
import {
  compressImageToWebP,
  AVATAR_MAX_DIMENSION_PX,
  AVATAR_QUALITY,
  AVATAR_TARGET_KB,
} from '@/lib/image-compressor';
import Avatar from './Avatar';
import Turnstile from './Turnstile';
import { useToast } from './Toast';

export interface SimpleAuthFormData {
  displayName: string;
  /** Already normalized via toUsernameSlug — safe to use as-is for the URL. */
  username: string;
  email: string;
  password: string;
  /** Compressed, ready to upload once the account exists. Optional. */
  avatarBlob: Blob | null;
  /** Undefined when Turnstile isn't configured for this project. */
  captchaToken?: string;
}

interface SimpleAuthFormProps {
  initialDisplayName?: string;
  initialEmail?: string;
  onSubmit: (data: SimpleAuthFormData) => Promise<void>;
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
  const toast = useToast();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  // The username field tracks the display name live until the user actually
  // edits it themselves — same derive-unless-overridden pattern used for the
  // rule defaults elsewhere in onboarding. Raw text is shown as typed (no
  // jarring live rewrites); it's only normalized into a URL-safe slug at
  // submit time, with a preview shown underneath so nothing is a surprise.
  const [usernameOverride, setUsernameOverride] = useState<string | null>(null);
  const usernameRaw = usernameOverride ?? displayName;
  const usernameSlug = toUsernameSlug(usernameRaw);

  const [avatar, setAvatar] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = avatar?.previewUrl ?? null;
  }, [avatar]);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingAvatar(true);
    try {
      const result = await compressImageToWebP(
        file,
        AVATAR_MAX_DIMENSION_PX,
        AVATAR_MAX_DIMENSION_PX,
        AVATAR_QUALITY,
        AVATAR_TARGET_KB
      );
      if (avatar?.previewUrl) URL.revokeObjectURL(avatar.previewUrl);
      setAvatar({ blob: result.blob, previewUrl: result.previewUrl });
    } catch (err) {
      console.error('Avatar compression error:', err);
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error(t('auth.nameRequired'));
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error(t('auth.emailInvalid'));
      return;
    }

    if (!isPasswordLongEnough(password)) {
      toast.error(t('auth.passwordShort', { min: PASSWORD_MIN_LENGTH }));
      return;
    }

    if (turnstileRequired && !captchaToken) {
      toast.error(t('auth.captchaRequired'));
      return;
    }

    try {
      await onSubmit({
        displayName: displayName.trim(),
        username: usernameSlug,
        email: email.trim(),
        password,
        avatarBlob: avatar?.blob ?? null,
        captchaToken: captchaToken ?? undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} id="auth-form">
      {/* Optional avatar — falls back to the initial-letter bubble everywhere
          else in the app if skipped, so nothing here is required. */}
      <div className="input-group" style={{ marginBottom: 0, alignItems: 'center' }}>
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
            <Avatar url={avatar?.previewUrl} displayName={displayName} />
          </div>

          <label
            className="btn btn-secondary btn-sm"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Upload size={16} />
            <span>{avatar ? t('auth.avatarChange') : t('auth.avatarUpload')}</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarSelect}
              disabled={isCompressingAvatar}
            />
          </label>

          {isCompressingAvatar && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-orange)' }}>{t('checklist.compressing')}</span>
          )}
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-display-name">
          {t('auth.nameLabel')}
        </label>
        <div className="field-with-icon">
          <input
            id="auth-display-name"
            type="text"
            className="input-field"
            placeholder={t('auth.namePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            required
          />
          <UserIcon size={18} className="field-icon" />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-username">
          {t('auth.usernameLabel')}
        </label>
        <div className="field-with-icon">
          <input
            id="auth-username"
            type="text"
            className="input-field"
            placeholder={t('auth.usernamePlaceholder')}
            value={usernameRaw}
            onChange={(e) => setUsernameOverride(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <AtSign size={18} className="field-icon" />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-email">
          {t('auth.emailLabel')}
        </label>
        <div className="field-with-icon">
          <input
            id="auth-email"
            type="email"
            className="input-field"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Mail size={18} className="field-icon" />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-password">
          {t('auth.passwordLabel', { min: PASSWORD_MIN_LENGTH })}
        </label>
        <div className="field-with-icon">
          <input
            id="auth-password"
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
          <Lock size={18} className="field-icon" />
        </div>
      </div>

      {turnstileRequired && <Turnstile onVerify={setCaptchaToken} />}

      {/* Kept brief and placed right at the point of commitment, not buried
          in a separate terms page nobody opens (start.md §14 — supportive
          tone, not legalese). */}
      <p className="field-hint" style={{ textAlign: 'center' }}>
        {t('auth.conductNotice')}
      </p>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '0.5rem' }}
        disabled={loading || (turnstileRequired && !captchaToken)}
        id="auth-submit-btn"
      >
        {loading ? t('auth.submitting') : (submitButtonText ?? t('auth.submitDefault'))}
        {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
