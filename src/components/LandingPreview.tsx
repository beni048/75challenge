'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STATIC_MOCK_FEED_POSTS, localizedCaption, localizedRules } from '@/lib/feed';
import { Flame, Shield, Users, ArrowRight, CheckCircle2, Award, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

/**
 * Public landing page: hero, introduction, and a read-only preview of what the
 * community feed looks like. Nothing here is interactive — visitors join first.
 */
export default function LandingPreview() {
  const { t, locale } = useI18n();

  return (
    <div className="landing-preview" style={{ padding: '2rem 0' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '4rem 0 3rem', maxWidth: '840px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div
            className="badge badge-fire"
            style={{ marginBottom: '1.25rem', padding: '0.45rem 1.2rem', fontSize: '0.88rem' }}
          >
            <Flame size={16} /> {t('hero.badge')}
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
              letterSpacing: '-0.03em',
              marginBottom: '1.35rem',
              fontWeight: 900,
            }}
          >
            {t('hero.titleLead')}{' '}
            <span
              style={{
                background: 'var(--gradient-fire)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('hero.titleAccent')}
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
            {t('hero.subtitle')}
          </p>

          <div style={{ marginBottom: '3.5rem' }}>
            <Link
              id="hero-join-btn"
              href="/join"
              className="btn btn-primary btn-lg pulse-active"
              style={{ padding: '1.15rem 2.75rem', fontSize: '1.2rem', fontWeight: 800 }}
            >
              {t('hero.cta')} <ArrowRight size={22} />
            </Link>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('hero.ctaSub')}
            </p>
          </div>

          {/* Introduction pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
            }}
          >
            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Award size={22} color="var(--accent-orange)" />
                <h4 style={{ fontSize: '1.05rem' }}>{t('pillars.rules.title')}</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{t('pillars.rules.desc')}</p>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Shield size={22} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '1.05rem' }}>{t('pillars.shield.title')}</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{t('pillars.shield.desc')}</p>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <Users size={22} color="var(--accent-green)" />
                <h4 style={{ fontSize: '1.05rem' }}>{t('pillars.hype.title')}</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{t('pillars.hype.desc')}</p>
            </div>
          </div>

          {/* Trust statement */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
          >
            <HeartHandshake size={26} color="var(--accent-orange)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>{t('trust.title')}</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('trust.body')}</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Read-only feed preview */}
      <section className="container" style={{ maxWidth: '780px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>{t('preview.title')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '620px', margin: '0 auto' }}>
            {t('preview.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} aria-hidden="true">
          {STATIC_MOCK_FEED_POSTS.map((post) => {
            const caption = localizedCaption(post, locale);
            const rules = localizedRules(post, locale);

            return (
              <div key={post.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.1rem' }}>{post.user.display_name}</h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      @{post.user.username} • {t('feed.dayOf75', { day: post.day_number })}
                    </span>
                  </div>
                  <span className={`badge ${post.status === 'completed' ? 'badge-success' : 'badge-shield'}`}>
                    {post.status === 'completed' ? t('feed.statusCompleted') : t('feed.statusShielded')}
                  </span>
                </div>

                {caption && (
                  <p
                    style={{
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      marginBottom: '1rem',
                      fontStyle: 'italic',
                    }}
                  >
                    “{caption}”
                  </p>
                )}

                {post.photo_url && (
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      marginBottom: '1rem',
                      background: 'var(--photo-backdrop)',
                      border: '1px solid var(--border-subtle)',
                      aspectRatio: '3 / 2',
                      position: 'relative',
                    }}
                  >
                    {/* Static sample assets, so next/image can optimize them. */}
                    <Image
                      src={post.photo_url}
                      alt=""
                      fill
                      sizes="(max-width: 820px) 100vw, 780px"
                      style={{ objectFit: 'cover' }}
                    />
                    <span
                      className="badge"
                      style={{
                        position: 'absolute',
                        top: '0.6rem',
                        left: '0.6rem',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-medium)',
                      }}
                    >
                      {t('preview.sampleBadge')}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
                  {rules.map((rule, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'var(--chip-bg)',
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

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.85rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {(
                    [
                      ['🔥', post.reactions.fire],
                      ['💪', post.reactions.beast],
                      ['🚀', post.reactions.launch],
                      ['🙌', post.reactions.hype],
                    ] as const
                  ).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: 'var(--radius-full)', cursor: 'default' }}
                    >
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/join" className="btn btn-primary btn-lg" style={{ padding: '1rem 2.5rem' }}>
            {t('hero.cta')} <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
