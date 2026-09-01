'use client';

import React, { useState } from 'react';
import { Rule } from '@/lib/streak-engine';
import {
  validateChallengeDates,
  formatDate,
  formatLongDate,
  getSupportedTimezones,
  CHALLENGE_DEADLINE,
} from '@/lib/date-utils';
import SimpleAuthForm, { SimpleAuthFormData } from './SimpleAuthForm';
import RuleCustomizer from './RuleCustomizer';
import ModalPortal from './ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flame, Users, Info, ArrowLeft, ArrowRight,
  ListChecks, RefreshCw, ShieldCheck, Scale, RotateCcw, User as UserIcon, MapPin, Globe2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { savePendingSignup, clearPendingSignup } from '@/lib/pending-signup';
import { useChallenge } from './ChallengeProvider';
import { createChallenge } from '@/lib/db/profile';
import { uploadAvatar } from '@/lib/db/avatar';
import { signUp } from '@/lib/auth';
import { useToast } from './Toast';
import { MIN_RULES, MAX_RULES, hasEnoughRules } from '@/lib/rules-policy';
// The unlock day comes from the constant the rule is actually enforced with,
// never typed into the copy — start.md's "numbers come from constants" rule.
import { RULES_CHANGE_UNLOCKS_ON_DAY } from '@/lib/rules-window';
import CommitmentPicker from './CommitmentPicker';
import { DEFAULT_COMMITMENT_LEVEL, type CommitmentLevel } from '@/lib/shield-policy';

const DETECTED_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
})();

const TIMEZONE_OPTIONS: string[] = (() => {
  const supported = getSupportedTimezones();
  return supported.length > 0 ? supported : [DETECTED_TIMEZONE];
})();

/**
 * Five sequential steps. Splitting them keeps each screen to one decision,
 * which matters most on a phone where everything else would need scrolling.
 * Commitment sits after rules deliberately: you can only judge how much slack
 * you want once you have seen what you just signed yourself up for.
 */
type Step = 'learn' | 'date' | 'rules' | 'commitment' | 'auth';
const STEP_ORDER: Step[] = ['learn', 'date', 'rules', 'commitment', 'auth'];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuredRules: Rule[];
  onRulesChange?: (rules: Rule[]) => void;
  referredBy?: string | null;
}

/** One point on the "how it works" screen. */
function LearnPoint({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="learn-point">
      <span className="learn-point-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong className="learn-point-title">{title}</strong>
        <span className="learn-point-body">{body}</span>
      </span>
    </li>
  );
}

export default function OnboardingModal({
  isOpen,
  onClose,
  configuredRules,
  onRulesChange,
  referredBy,
}: OnboardingModalProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { session, setChallenge } = useChallenge();

  const [step, setStep] = useState<Step>('learn');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [timezone, setTimezone] = useState(DETECTED_TIMEZONE);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel>(DEFAULT_COMMITMENT_LEVEL);
  /**
   * Set the moment signUp() succeeds.
   *
   * The account step branches on `session`, and signing up CREATES a session —
   * so without this the step swapped to the "you are already signed in" resume
   * form for the instant between the auth call landing and router.push firing,
   * flashing a second name field at someone who had just filled one in.
   * The resume form is only ever for someone who arrived already
   * authenticated, which this distinguishes.
   */
  const [justSignedUp, setJustSignedUp] = useState(false);

  const { endDate, infoNoticeKey, infoNoticeVars, valid: dateValid, errorKey, errorVars } =
    validateChallengeDates(startDate);
  const infoNotice = infoNoticeKey
    ? t(infoNoticeKey, {
        date: formatLongDate(String(infoNoticeVars?.date ?? endDate), locale),
        deadline: formatLongDate(String(infoNoticeVars?.deadline ?? ''), locale),
      })
    : null;
  // Hard block, distinct from the soft infoNotice above — see
  // validateChallengeDates' own doc comment for why these are two different
  // things rather than one severity dial.
  const dateError =
    errorKey && startDate
      ? t(errorKey, { deadline: formatLongDate(String(errorVars?.deadline ?? ''), locale) })
      : null;

  const stepIndex = STEP_ORDER.indexOf(step);
  const goTo = (next: Step) => setStep(next);
  const goBack = () => setStep(STEP_ORDER[Math.max(0, stepIndex - 1)]);

  const handleSignupAndCommit = async (authData: SimpleAuthFormData) => {
    if (!hasEnoughRules(configuredRules.length)) {
      toast.error(t('onboarding.minRulesAlert', { min: MIN_RULES }));
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(authData.email, authData.password, authData.captchaToken);

      // Before any await that could let a re-render observe the new session.
      if (result.ok) setJustSignedUp(true);

      if (!result.ok) {
        setLoading(false);
        toast.error(t(result.errorKey ?? 'onboarding.signupFailed', result.errorVars));
        return;
      }

      // Park the chosen habits and start date either way, so they survive an
      // email-confirmation round trip. The avatar can't come along — see
      // pending-signup.ts's documented limitation — it's re-addable from
      // Account settings afterwards.
      savePendingSignup({
        displayName: authData.displayName,
        username: authData.username,
        startDate,
        timezone,
        location: location.trim() || null,
        rules: configuredRules,
        referredByUsername: referredBy ?? null,
      });

      if (!result.hasSession || !result.userId) {
        // Confirmation required: the challenge row cannot be written until the
        // user is authenticated. ChallengeProvider creates it on first visit.
        // As with the success path, navigation unmounts this modal — closing it
        // first would flash the /join page in between. The toast is rendered at
        // the app level, so it survives the route change.
        toast.info(t('signup.confirmEmail'));
        router.push('/login');
        return;
      }

      // Upload the avatar now, while a session already exists, so its durable
      // URL can be written in the same createChallenge call below.
      let avatarUrl: string | null = null;
      if (authData.avatarBlob) {
        const uploaded = await uploadAvatar(result.userId, authData.avatarBlob);
        if (uploaded.data) avatarUrl = uploaded.data;
      }

      const created = await createChallenge({
        userId: result.userId,
        displayName: authData.displayName,
        username: authData.username,
        startDate,
        timezone,
        location: location.trim() || null,
        avatarUrl,
        rules: configuredRules,
        commitmentLevel,
        referredByUsername: referredBy ?? null,
      });

      if (created.error || !created.data) {
        setLoading(false);
        toast.error(created.error ?? t('onboarding.signupFailed'));
        return;
      }

      // Push the complete, correct result into shared context *before*
      // navigating, so the destination page's first render already has full
      // data — regardless of whether ChallengeProvider's own auth-listener is
      // independently racing to do the same thing right now (see the
      // "Immediate hotfix" note in this codebase's history: without this, the
      // profile page could render with an empty rules array until refreshed).
      setChallenge(created.data);
      clearPendingSignup();

      // Deliberately NOT closing the modal, and NOT clearing `loading`.
      // Closing it first plays a 0.2s exit animation that reveals the /join
      // page underneath before the route changes, and clearing loading flips
      // the button back to "start my 75 days" — so the last thing you saw was
      // the form you had just submitted, blinking, over the page you were
      // leaving. Navigation unmounts the whole page; letting it do that keeps
      // the submitting state on screen until the profile paints.
      router.push(`/user/${created.data.username}`);
    } catch (err) {
      console.error('Signup error:', err);
      setLoading(false);
      toast.error(t('onboarding.signupFailed'));
    }
  };

  /**
   * For someone who already has a Supabase session but no challenge — a
   * previous signup attempt whose account was created but whose challenge
   * write failed, or an email-confirmation redirect landing them back here.
   * Re-running signUp() for this person would fail with "email already
   * exists"; the fix is to skip straight to writing the challenge against the
   * session they already hold.
   */
  const handleResumeSetup = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user) return;

    if (!resumeName.trim()) {
      toast.error(t('auth.nameRequired'));
      return;
    }
    if (!hasEnoughRules(configuredRules.length)) {
      toast.error(t('onboarding.minRulesAlert', { min: MIN_RULES }));
      return;
    }

    setLoading(true);
    const created = await createChallenge({
      userId: session.user.id,
      displayName: resumeName.trim(),
      startDate,
      timezone,
      location: location.trim() || null,
      rules: configuredRules,
      referredByUsername: referredBy ?? null,
    });
    if (created.error || !created.data) {
      setLoading(false);
      toast.error(created.error ?? t('onboarding.resumeFailed'));
      return;
    }

    setChallenge(created.data);
    // Same as above: navigation unmounts this, so closing first would only
    // flash the page behind it.
    router.push(`/user/${created.data.username}`);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <AnimatePresence>
        {isOpen && (
          <div className="modal-backdrop" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.2 }}
              className="modal-content onboarding-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t('onboarding.title')}
            >
              {/* Header */}
              <div className="onboarding-head">
                {stepIndex > 0 ? (
                  <button type="button" onClick={goBack} className="icon-btn" aria-label={t('onboarding.back')}>
                    <ArrowLeft size={17} />
                  </button>
                ) : (
                  <Flame size={22} color="var(--accent-orange)" />
                )}

                <span className="onboarding-step-label">
                  {t('onboarding.stepOf', { current: stepIndex + 1, total: STEP_ORDER.length })}
                </span>

                <button type="button" onClick={onClose} className="icon-btn" aria-label={t('onboarding.close')}>
                  <X size={17} />
                </button>
              </div>

              {/* Progress */}
              <div className="onboarding-progress" aria-hidden="true">
                {STEP_ORDER.map((s, i) => (
                  <span key={s} className={`onboarding-progress-bar${i <= stepIndex ? ' is-done' : ''}`} />
                ))}
              </div>

              {referredBy && (
                <div className="notice notice-info" style={{ marginBottom: '1rem' }}>
                  <Users size={16} style={{ flexShrink: 0 }} />
                  <span>{t('onboarding.referral', { username: referredBy })}</span>
                </div>
              )}

              {/* ---------- Step 1: how it works ---------- */}
              {step === 'learn' && (
                <div className="stack">
                  <div>
                    <h3 className="h-page">{t('onboarding.learnTitle')}</h3>
                    <p className="onboarding-lede">{t('onboarding.learnIntro')}</p>
                  </div>

                  <ul className="learn-list">
                    <LearnPoint
                      icon={<ListChecks size={18} />}
                      title={t('onboarding.learnHabits', { min: MIN_RULES })}
                      body={t('onboarding.learnHabitsDesc', { min: MIN_RULES, max: MAX_RULES })}
                    />
                    <LearnPoint
                      icon={<RefreshCw size={18} />}
                      title={t('onboarding.learnChange', { day: RULES_CHANGE_UNLOCKS_ON_DAY })}
                      body={t('onboarding.learnChangeDesc')}
                    />
                    <LearnPoint
                      icon={<ShieldCheck size={18} />}
                      title={t('onboarding.learnShield')}
                      body={t('onboarding.learnShieldDesc')}
                    />
                    <LearnPoint
                      icon={<Scale size={18} />}
                      title={t('onboarding.learnJudge')}
                      body={t('onboarding.learnJudgeDesc')}
                    />
                    <LearnPoint
                      icon={<RotateCcw size={18} />}
                      title={t('onboarding.learnReset')}
                      body={t('onboarding.learnResetDesc')}
                    />
                  </ul>

                  <button type="button" onClick={() => goTo('date')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                    {t('onboarding.learnCta')} <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* ---------- Step 2: start date ---------- */}
              {step === 'date' && (
                <div className="stack">
                  <div>
                    <h3 className="h-page">{t('onboarding.dateTitle')}</h3>
                    <p className="onboarding-lede">{t('onboarding.dateIntro')}</p>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" htmlFor="modal-start-date">
                      {t('onboarding.startDateLabel')}
                    </label>
                    <input
                      id="modal-start-date"
                      type="date"
                      className="input-field"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      // Native affordance only — validateChallengeDates is the
                      // real enforcement below, since `max` alone would silently
                      // let through a pasted or scripted out-of-range value.
                      max={CHALLENGE_DEADLINE}
                    />
                  </div>

                  {dateValid && (
                    <div className="onboarding-finish">
                      <Calendar size={16} color="var(--accent-orange)" style={{ flexShrink: 0 }} />
                      <span>{t('onboarding.finish', { date: formatLongDate(endDate, locale) })}</span>
                    </div>
                  )}

                  {/* Finishing after the shared goal is allowed — just flagged. */}
                  {infoNotice && (
                    <div className="notice notice-info">
                      <Info size={16} style={{ flexShrink: 0 }} />
                      <span>{infoNotice}</span>
                    </div>
                  )}

                  {/* A start date past the deadline itself is a hard block —
                      there is no computed end date to show. */}
                  {dateError && (
                    <div className="notice notice-error">
                      <Info size={16} style={{ flexShrink: 0 }} />
                      <span>{dateError}</span>
                    </div>
                  )}

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" htmlFor="modal-timezone">
                      {t('onboarding.timezoneLabel')}
                    </label>
                    <div className="field-with-icon">
                      <select
                        id="modal-timezone"
                        className="input-field"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                      <Globe2 size={18} className="field-icon" />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {t('onboarding.timezoneHint')}
                    </p>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" htmlFor="modal-location">
                      {t('onboarding.locationLabel')}
                    </label>
                    <div className="field-with-icon">
                      <input
                        id="modal-location"
                        type="text"
                        className="input-field"
                        placeholder={t('onboarding.locationPlaceholder')}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <MapPin size={18} className="field-icon" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => goTo('rules')}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    disabled={!dateValid}
                  >
                    {t('onboarding.dateCta')} <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* ---------- Step 3: habits ---------- */}
              {step === 'rules' && (
                <div className="stack">
                  <div className="split">
                    <h3 className="h-page">{t('onboarding.rulesTitle')}</h3>
                    <span className={`badge ${hasEnoughRules(configuredRules.length) ? 'badge-success' : 'badge-fire'}`}>
                      {configuredRules.length === 1
                        ? t('rules.countOne', { count: configuredRules.length })
                        : t('rules.countMany', { count: configuredRules.length })}
                    </span>
                  </div>

                  <RuleCustomizer
                    rules={configuredRules}
                    onChange={(updated) => onRulesChange?.(updated)}
                    hideHeading
                  />

                  <button
                    type="button"
                    onClick={() => goTo('commitment')}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    disabled={!hasEnoughRules(configuredRules.length)}
                  >
                    {t('onboarding.rulesCta')} <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* ---------- Step 4: commitment level ---------- */}
              {step === 'commitment' && (
                <div className="stack">
                  <div>
                    <h3 className="h-page">{t('commitment.stepTitle')}</h3>
                    <p className="onboarding-lede">{t('commitment.stepIntro')}</p>
                  </div>

                  <CommitmentPicker value={commitmentLevel} onChange={setCommitmentLevel} />

                  <button
                    type="button"
                    onClick={() => goTo('auth')}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                  >
                    {t('commitment.stepCta')} <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* ---------- Step 5: account ---------- */}
              {step === 'auth' && (
                <div className="stack">
                  <div className="onboarding-summary">
                    <span>
                      {t('onboarding.summary', {
                        start: formatLongDate(startDate, locale),
                        end: formatLongDate(endDate, locale),
                      })}
                    </span>
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      {t(`commitment.${commitmentLevel}.name` as TranslationKey)}
                    </span>
                  </div>

                  {session && !justSignedUp ? (
                    // Already authenticated with no challenge yet (§ handleResumeSetup) —
                    // finish setup against the existing session instead of signing up again.
                    <form onSubmit={handleResumeSetup} className="stack">
                      <div className="notice notice-info">
                        <Info size={16} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>{t('onboarding.resumeTitle')}</strong> {t('onboarding.resumeBody')}
                        </span>
                      </div>

                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" htmlFor="resume-display-name">
                          {t('auth.nameLabel')}
                        </label>
                        <div className="field-with-icon">
                          <input
                            id="resume-display-name"
                            type="text"
                            className="input-field"
                            placeholder={t('auth.namePlaceholder')}
                            value={resumeName}
                            onChange={(e) => setResumeName(e.target.value)}
                            autoComplete="nickname"
                            required
                          />
                          <UserIcon size={18} className="field-icon" />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? t('auth.submitting') : t('onboarding.submit')}
                      </button>
                    </form>
                  ) : (
                    <SimpleAuthForm
                      onSubmit={handleSignupAndCommit}
                      submitButtonText={t('onboarding.submit')}
                      loading={loading}
                    />
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
