'use client';

import React, { useState } from 'react';
import RuleCustomizer, { DEFAULT_75_HARD_RULES } from './RuleCustomizer';
import OnboardingModal from './OnboardingModal';
import { Rule } from '@/lib/streak-engine';
import { STATIC_MOCK_FEED_POSTS } from '@/lib/feed';
import { Flame, Shield, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPreview() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_75_HARD_RULES);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <div className="landing-preview" style={{ padding: '2rem 0' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3.5rem 0 2.5rem', maxWidth: '820px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="badge badge-fire"
            style={{ marginBottom: '1.2rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <Flame size={16} /> 75 DAYS OF DISCIPLINE & BROTHERHOOD
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              fontWeight: 900,
            }}
          >
            Hard Discipline.{' '}
            <span
              style={{
                background: 'var(--gradient-fire)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Flexible Rules.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2rem',
            }}
          >
            Build unbroken habits with customized rules, a generous <strong>3:00 AM reset window</strong> for night owls,
            and <strong>1 Streak Shield</strong> to survive emergencies. Zero toxicity, 100% positive hype.
          </p>

          {/* Quick Feature Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              textAlign: 'left',
              marginBottom: '2.5rem',
            }}
          >
            <div className="glass-card" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Clock size={20} color="var(--accent-orange)" />
                <h4 style={{ fontSize: '1rem' }}>3:00 AM Reset</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Log until 2:59 AM without losing your streak. Fits real-world schedules.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Shield size={20} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '1rem' }}>1 Streak Shield</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                One lifeline per attempt. Miss a day? Shield protects you once. Miss twice? Day 1.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Users size={20} color="var(--accent-green)" />
                <h4 style={{ fontSize: '1rem' }}>Positive-Only Hype</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No negative comments or downvotes. Multi-tap fire, beast, launch, and hype emojis only.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Interactive Try-Before-Signup Rule Builder */}
      <section className="container" style={{ maxWidth: '840px', marginBottom: '4rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card"
          style={{
            padding: '2rem',
            border: '1px solid var(--border-accent)',
            boxShadow: 'var(--glow-orange)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span className="badge badge-fire" style={{ marginBottom: '0.5rem' }}>
              Interactive Try-Before-Signup
            </span>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>
              Step 1: Test-Drive Your Challenge Rules
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Add, remove, or customize your schedule right here. When ready, commit and start!
            </p>
          </div>

          {/* Embedded Rule Customizer */}
          <RuleCustomizer rules={rules} onChange={setRules} />

          {/* Launch Button Trigger */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              id="commit-launch-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="btn btn-primary btn-lg pulse-active"
              style={{ padding: '1.1rem 2.5rem', fontSize: '1.15rem' }}
              disabled={rules.length < 2}
            >
              Commit & Launch 75 Days <ArrowRight size={20} />
            </button>
            <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Start window in September. Finishes on or before December 31st.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Static Live Feed Preview Stream (Strava-Style) */}
      <section className="container" style={{ maxWidth: '840px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>Community Activity Preview</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            See how challenge participants log workouts, share progress, and hype each other up.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {STATIC_MOCK_FEED_POSTS.map((post) => (
            <div key={post.id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem' }}>{post.user.display_name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    @{post.user.username} • Day {post.day_number} of 75
                  </span>
                </div>
                <span className={`badge ${post.status === 'completed' ? 'badge-success' : 'badge-shield'}`}>
                  {post.status === 'completed' ? 'Day Completed' : 'Shield Used'}
                </span>
              </div>

              {post.caption && (
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                  "{post.caption}"
                </p>
              )}

              {/* Checked-off rules list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
                {post.completed_rules.map((rule, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <CheckCircle2 size={14} color="var(--accent-green)" />
                    {rule}
                  </span>
                ))}
              </div>

              {/* Reactions Bar */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                }}
              >
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  🔥 {post.reactions.fire}
                </button>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  💪 {post.reactions.beast}
                </button>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  🚀 {post.reactions.launch}
                </button>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  🙌 {post.reactions.hype}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Onboarding Modal Transfer */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        configuredRules={rules}
      />
    </div>
  );
}
