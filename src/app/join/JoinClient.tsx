'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RuleCustomizer, { DEFAULT_75_HARD_RULES } from '@/components/RuleCustomizer';
import OnboardingModal from '@/components/OnboardingModal';
import { Rule } from '@/lib/streak-engine';
import { Users, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinClient() {
  const searchParams = useSearchParams();
  const refUsername = searchParams.get('ref');
  const [rules, setRules] = useState<Rule[]>(DEFAULT_75_HARD_RULES);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '800px' }}>
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
              <Users size={16} /> Invited by @{refUsername}
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
            {refUsername ? `Join @${refUsername}'s 75-Day Squad` : 'Launch Your 75-Day Challenge'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Customize your rule set, set your September start date, and hold each other accountable through unbroken daily discipline.
          </p>
        </div>

        {/* Customizer Box */}
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <RuleCustomizer rules={rules} onChange={setRules} />

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="btn btn-primary btn-lg pulse-active"
              style={{ width: '100%', maxWidth: '420px', padding: '1rem 2rem' }}
              disabled={rules.length < 2}
            >
              {refUsername ? `Commit with @${refUsername}` : 'Commit & Launch Challenge'} <ArrowRight size={18} />
            </button>
            <p style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Includes 3:00 AM reset cutoff + 1 Streak Shield per attempt
            </p>
          </div>
        </div>
      </motion.div>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        configuredRules={rules}
        referredBy={refUsername}
      />
    </div>
  );
}
