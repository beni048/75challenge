'use client';

import React, { useState } from 'react';
import { Rule } from '@/lib/streak-engine';
import { validateChallengeDates, calculateTargetEndDate } from '@/lib/date-utils';
import SimpleAuthForm from './SimpleAuthForm';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ShieldCheck, Flame, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuredRules: Rule[];
  referredBy?: string | null;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  configuredRules,
  referredBy,
}: OnboardingModalProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-09-01`);
  const [loading, setLoading] = useState(false);

  const { valid, error: dateError, endDate } = validateChallengeDates(startDate);

  const handleSignupAndCommit = async (authData: { displayName: string; email: string; password: string }) => {
    if (!valid) return;
    if (configuredRules.length < 2) return;

    setLoading(true);

    try {
      // In a real flow, calls Supabase signup + inserts user profile & rules
      // For instant UX, we save the active state into localStorage as a backup session
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

      // Route to feed or user dashboard
      router.push(`/user/${userPayload.username}`);
    } catch (err) {
      console.error('Signup error:', err);
      alert('Signup failed. Please check your credentials.');
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
            style={{ maxWidth: '560px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Flame size={24} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.35rem' }}>Commit & Launch 75 Days</h3>
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
                <span>Squad Referral: Joining under <strong>@{referredBy}</strong></span>
              </div>
            )}

            {/* Date Selection Box */}
            <div
              className="glass-card"
              style={{
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="start-date-input">
                  Select Start Date (Must be in September)
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    id="start-date-input"
                    type="date"
                    className="input-field"
                    style={{ flex: 1 }}
                    min={`${currentYear}-09-01`}
                    max={`${currentYear}-09-30`}
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
                    }}
                  >
                    <Calendar size={16} color="var(--accent-orange)" />
                    <span>Target Finish: <strong>{endDate}</strong></span>
                  </div>
                </div>
                {dateError && (
                  <p style={{ color: '#ff5252', fontSize: '0.8rem', marginTop: '0.3rem' }}>{dateError}</p>
                )}
              </div>

              {/* Rules summary banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Configured: <strong>{configuredRules.length} rules</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-cyan)' }}>
                  <ShieldCheck size={16} /> 1 Streak Shield included
                </span>
              </div>
            </div>

            {/* Auth Form */}
            <SimpleAuthForm
              onSubmit={handleSignupAndCommit}
              submitButtonText="Finalize & Start Challenge"
              loading={loading}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
