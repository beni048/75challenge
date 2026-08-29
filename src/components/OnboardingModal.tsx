'use client';

import React, { useState } from 'react';
import { Rule } from '@/lib/streak-engine';
import { validateChallengeDates, formatDate } from '@/lib/date-utils';
import SimpleAuthForm from './SimpleAuthForm';
import RuleCustomizer from './RuleCustomizer';
import ModalPortal from './ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flame, Users, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { savePendingSignup } from '@/lib/pending-signup';
import { createChallenge } from '@/lib/db/profile';
import { signUp } from '@/lib/auth';
import { useToast } from './Toast';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuredRules: Rule[];
  onRulesChange?: (rules: Rule[]) => void;
  referredBy?: string | null;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  configuredRules,
  onRulesChange,
  referredBy,
}: OnboardingModalProps) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [activeStep, setActiveStep] = useState<'rules' | 'auth'>('rules');
  const [loading, setLoading] = useState(false);

  const { endDate, infoNoticeKey, infoNoticeVars } = validateChallengeDates(startDate);
  const infoNotice = infoNoticeKey ? t(infoNoticeKey, infoNoticeVars) : null;

  const handleSignupAndCommit = async (authData: {
    displayName: string;
    email: string;
    password: string;
  }) => {
    if (configuredRules.length < 2) {
      toast.error(t('onboarding.minRulesAlert'));
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(authData.email, authData.password);

      if (!result.ok) {
        setLoading(false);
        toast.error(result.message ?? t('onboarding.signupFailed'));
        return;
      }

      // The chosen rules and start date are parked locally either way, so they
      // survive an email-confirmation round trip.
      savePendingSignup({
        displayName: authData.displayName,
        startDate,
        rules: configuredRules,
        referredByUsername: referredBy ?? null,
      });

      if (!result.hasSession || !result.userId) {
        // The project requires email confirmation: the challenge row cannot be
        // written until the user is authenticated. ChallengeProvider creates it
        // on their first signed-in visit.
        setLoading(false);
        onClose();
        toast.info(t('signup.confirmEmail'));
        router.push('/login');
        return;
      }

      const created = await createChallenge({
        userId: result.userId,
        displayName: authData.displayName,
        startDate,
        rules: configuredRules,
        referredByUsername: referredBy ?? null,
      });

      setLoading(false);

      if (created.error || !created.data) {
        toast.error(created.error ?? t('onboarding.signupFailed'));
        return;
      }

      onClose();
      router.push(`/user/${created.data.username}`);
    } catch (err) {
      console.error('Signup error:', err);
      setLoading(false);
      toast.error(t('onboarding.signupFailed'));
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <AnimatePresence>
        {isOpen && (
          <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px' }}
            role="dialog"
            aria-modal="true"
            aria-label={t('onboarding.title')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Flame size={24} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.35rem' }}>{t('onboarding.title')}</h3>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label={t('onboarding.close')}
              >
                <X size={20} />
              </button>
            </div>

            {referredBy && (
              <div className="notice notice-info" style={{ marginBottom: '1rem' }}>
                <Users size={16} />
                <span>{t('onboarding.referral', { username: referredBy })}</span>
              </div>
            )}

            {/* Step tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveStep('rules')}
                className={`btn btn-sm ${activeStep === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                {t('onboarding.stepRules')}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('auth')}
                className={`btn btn-sm ${activeStep === 'auth' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={configuredRules.length < 2}
              >
                {t('onboarding.stepAuth')}
              </button>
            </div>

            {activeStep === 'rules' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  className="glass-card"
                  style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" htmlFor="modal-start-date">
                      {t('onboarding.startDateLabel')}
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        id="modal-start-date"
                        type="date"
                        className="input-field"
                        style={{ flex: '1 1 180px' }}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar size={16} color="var(--accent-orange)" />
                        <span>{t('onboarding.finish', { date: endDate })}</span>
                      </div>
                    </div>

                    {/* Non-blocking notice when the 75 days run past 31 December */}
                    {infoNotice && (
                      <div className="notice notice-info" style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                        <Info size={14} />
                        <span>{infoNotice}</span>
                      </div>
                    )}
                  </div>
                </div>

                <RuleCustomizer rules={configuredRules} onChange={(updated) => onRulesChange?.(updated)} />

                <button
                  type="button"
                  onClick={() => setActiveStep('auth')}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={configuredRules.length < 2}
                >
                  {t('onboarding.continue')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--chip-bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>{t('onboarding.summary', { start: startDate, end: endDate })}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{t('onboarding.shieldIncluded')}</span>
                </div>

                <SimpleAuthForm
                  onSubmit={handleSignupAndCommit}
                  submitButtonText={t('onboarding.submit')}
                  loading={loading}
                />
              </div>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
