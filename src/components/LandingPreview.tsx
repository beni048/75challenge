'use client';

import React, { useState } from 'react';
import OnboardingModal from './OnboardingModal';
import { Rule } from '@/lib/streak-engine';
import { DEFAULT_75_HARD_RULES } from './RuleCustomizer';
import { STATIC_MOCK_FEED_POSTS } from '@/lib/feed';
import { Flame, Shield, Users, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPreview() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_75_HARD_RULES);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <div className="landing-preview" style={{ padding: '2rem 0' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 0 3rem', maxWidth: '840px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="badge badge-fire"
            style={{ marginBottom: '1.25rem', padding: '0.45rem 1.2rem', fontSize: '0.88rem' }}
          >
            <Flame size={16} /> 75 DAYS OF DISCIPLINE & ACCOUNTABILITY
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
              letterSpacing: '-0.03em',
              marginBottom: '1.35rem',
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
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
            }}
          >
            Forge unbreakable daily habits with personalized rule sets, asynchronous self-paced logging,
            and <strong>1 Streak Shield</strong> to survive emergencies. Zero toxicity, 100% positive hype.
          </p>

          {/* Main Join CTA Button */}
          <div style={{ marginBottom: '3.5rem' }}>
            <button
              id="hero-join-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="btn btn-primary btn-lg pulse-active"
              style={{ padding: '1.15rem 2.75rem', fontSize: '1.2rem', fontWeight: 800 }}
            >
              Join 75 Challenge <ArrowRight size={22} />
            </button>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tailor your own rules • Free forever • 1 Streak Shield per attempt
            </p>
          </div>

          {/* Quick Feature Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              textAlign: 'left',
              marginBottom: '4rem',
            }}
          >
            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Award size={22} color="var(--accent-orange)" />
                <h4 style={{ fontSize: '1.05rem' }}>Customizable Rules</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Set daily, workday, or custom schedules that fit your fitness, reading, and mental growth goals.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Shield size={22} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '1.05rem' }}>1 Streak Shield</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                One lifeline per attempt. If you miss a day, deploy your shield once to save your progress.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Users size={22} color="var(--accent-green)" />
                <h4 style={{ fontSize: '1.05rem' }}>Positive-Only Hype</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                No negative comments or downvotes. Celebrate milestones with multi-tap emoji reactions and confetti.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Static Live Feed Preview Stream */}
      <section className="container" style={{ maxWidth: '840px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Community Activity Stream</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Check out how participants check off daily rules, share proof, and hype up each other's streaks.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {STATIC_MOCK_FEED_POSTS.map((post) => (
            <div key={post.id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem' }}>{post.user.display_name}</h4>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="btn btn-primary btn-lg"
            style={{ padding: '1rem 2.5rem' }}
          >
            Join 75 Challenge <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        configuredRules={rules}
        onRulesChange={setRules}
      />
    </div>
  );
}
