'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import OnboardingModal from '@/components/OnboardingModal';
import { Rule } from '@/lib/streak-engine';
import { DEFAULT_75_HARD_RULES } from '@/components/RuleCustomizer';
import { Users, Flame, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinClient() {
  const searchParams = useSearchParams();
  const refUsername = searchParams.get('ref');
  const [rules, setRules] = useState<Rule[]>(DEFAULT_75_HARD_RULES);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '740px' }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {refUsername ? (
            <div
              className="badge badge-shield"
              style={{ marginBottom: '1rem', padding: '0.45rem 1.2rem', fontSize: '0.9rem' }}
            >
              <Users size={16} /> Squad Referral: @{refUsername}
            </div>
          ) : (
            <div
              className="badge badge-fire"
              style={{ marginBottom: '1rem', padding: '0.45rem 1.2rem', fontSize: '0.9rem' }}
            >
              <Flame size={16} /> SQUAD ONBOARDING
            </div>
          )}

          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {refUsername ? `Join @${refUsername}'s 75 Challenge` : 'Join the 75 Challenge'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
            Build habits with personalized rules, self-paced progress logging, and 1 Streak Shield lifeline.
          </p>
        </div>

        {/* Action Card */}
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--accent-orange)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Custom Rules</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>1 Streak Shield</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-green)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Positive Hype Only</span>
            </div>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="btn btn-primary btn-lg pulse-active"
            style={{ width: '100%', maxWidth: '380px', padding: '1rem 2rem' }}
          >
            {refUsername ? `Join with @${refUsername}` : 'Join 75 Challenge'} <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        configuredRules={rules}
        onRulesChange={setRules}
        referredBy={refUsername}
      />
    </div>
  );
}
