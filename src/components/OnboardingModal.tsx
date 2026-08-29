'use client';

import React, { useState } from 'react';
import { Rule } from '@/lib/streak-engine';
import { validateChallengeDates, calculateTargetEndDate, formatDate } from '@/lib/date-utils';
import SimpleAuthForm from './SimpleAuthForm';
import RuleCustomizer from './RuleCustomizer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ShieldCheck, Flame, Users, Info, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [activeStep, setActiveStep] = useState<'rules' | 'auth'>('rules');
  const [loading, setLoading] = useState(false);

  const { valid, endDate, infoNotice, error: dateError } = validateChallengeDates(startDate);

  const handleSignupAndCommit = async (authData: { displayName: string; email: string; password: string }) => {
    if (configuredRules.length < 2) {
      alert('Please configure at least 2 active rules.');
      return;
    }

    setLoading(true);

    try {
      const userPayload = {
        id: `user-${Date.now()}`,
        username: authData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        display_name: authData.displayName,
        email: authData.email,
        start_date: startDate,
        target_end_date: endDate,
        current_day: 1,
        shields_remaining: 1,
        status: 'active',
        referred_by: referredBy || null,
        rules: configuredRules,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('75_user_session', JSON.stringify(userPayload));
      }

      router.push(`/user/${userPayload.username}`);
    } catch (err) {
      console.error('Signup error:', err);
      alert('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Flame size={24} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.35rem' }}>Join the 75 Challenge</h3>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {referredBy && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <Users size={16} />
                <span>Squad Referral: Joining with <strong>@{referredBy}</strong></span>
              </div>
            )}

            {/* Step Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveStep('rules')}
                className={`btn btn-sm ${activeStep === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                1. Rules & Schedule
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('auth')}
                className={`btn btn-sm ${activeStep === 'auth' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={configuredRules.length < 2}
              >
                2. Account & Launch
              </button>
            </div>

            {activeStep === 'rules' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Date Selection Box */}
                <div
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    backgroundColor: 'var(--bg-tertiary)',
                  }}
                >
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" htmlFor="modal-start-date">
                      Choose Your Start Date
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        id="modal-start-date"
                        type="date"
                        className="input-field"
                        style={{ flex: 1 }}
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
                        <span>Finish: <strong>{endDate}</strong></span>
                      </div>
                    </div>

                    {/* Non-blocking Dec 31 Info Notice */}
                    {infoNotice && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginTop: '0.5rem',
                          padding: '0.4rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(0, 229, 255, 0.1)',
                          border: '1px solid rgba(0, 229, 255, 0.25)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <Info size={14} />
                        <span>{infoNotice}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Embedded Rule Customizer */}
                <RuleCustomizer
                  rules={configuredRules}
                  onChange={(updated) => onRulesChange && onRulesChange(updated)}
                />

                <button
                  type="button"
                  onClick={() => setActiveStep('auth')}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={configuredRules.length < 2}
                >
                  Continue to Registration
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>Start: <strong>{startDate}</strong> → Finish: <strong>{endDate}</strong></span>
                  <span style={{ color: 'var(--accent-cyan)' }}>1 Shield included</span>
                </div>

                <SimpleAuthForm
                  onSubmit={handleSignupAndCommit}
                  submitButtonText="Join 75 Challenge"
                  loading={loading}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
