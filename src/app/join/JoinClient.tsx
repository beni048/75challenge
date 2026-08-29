'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import OnboardingModal from '@/components/OnboardingModal';
import { Rule } from '@/lib/streak-engine';
import { getDefaultRules } from '@/components/RuleCustomizer';
import { Users, Flame, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

export default function JoinClient() {
  const searchParams = useSearchParams();
  const refUsername = searchParams.get('ref');
  const { t, locale } = useI18n();

  const [editedRules, setEditedRules] = useState<Rule[] | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Until the visitor edits them, the starter rules follow the interface
  // language. Once edited, the titles are their own text and stay put — so this
  // is derived from state rather than copied into it.
  const rules = editedRules ?? getDefaultRules(locale);

  const perks = [
    { icon: <Award size={18} color="var(--accent-orange)" />, label: t('join.perkRules') },
    { icon: <ShieldCheck size={18} color="var(--accent-cyan)" />, label: t('join.perkShield') },
    { icon: <Users size={18} color="var(--accent-green)" />, label: t('join.perkHype') },
  ];

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '740px' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {refUsername ? (
            <div className="badge badge-shield" style={{ marginBottom: '1rem', padding: '0.45rem 1.2rem', fontSize: '0.9rem' }}>
              <Users size={16} /> {t('join.badgeReferral', { username: refUsername })}
            </div>
          ) : (
            <div className="badge badge-fire" style={{ marginBottom: '1rem', padding: '0.45rem 1.2rem', fontSize: '0.9rem' }}>
              <Flame size={16} /> {t('join.badgeDefault')}
            </div>
          )}

          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {refUsername ? t('join.titleReferral', { username: refUsername }) : t('join.titleDefault')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
            {t('join.subtitle')}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {perks.map((perk) => (
              <div key={perk.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {perk.icon}
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{perk.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="btn btn-primary btn-lg pulse-active"
            style={{ width: '100%', maxWidth: '380px', padding: '1rem 2rem' }}
          >
            {refUsername ? t('join.ctaReferral', { username: refUsername }) : t('join.ctaDefault')}{' '}
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        configuredRules={rules}
        onRulesChange={setEditedRules}
        referredBy={refUsername}
      />
    </div>
  );
}
