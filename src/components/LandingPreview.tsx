'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STATIC_MOCK_FEED_POSTS, localizedCaption, localizedRules } from '@/lib/feed';
import { Flame, Shield, Users, ArrowRight, CheckCircle2, Award, HeartHandshake, Sparkles, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CHALLENGE_DEADLINE } from '@/lib/challenge-goal';
import { formatLongDate } from '@/lib/date-utils';

/**
 * Public landing page, in reading order:
 *   hero → how it works → what the community looks like → closing CTA
 *
 * This reverses an earlier, deliberate choice to put the feed preview first
 * (on the theory that seeing real people mid-challenge is more persuasive
 * than being told the rules first) — an explicit product decision, not a
 * regression. Nothing in the preview is interactive — visitors join before
 * they can react.
 *
 * Backgrounds alternate so the sections read as distinct: only "how it works"
 * carries the tinted `.landing-band`. Three CTAs are spaced evenly down the
 * page — hero, after the explanation, and after the preview.
 */
export default function LandingPreview() {
  const { t, locale } = useI18n();
  const deadline = formatLongDate(CHALLENGE_DEADLINE, locale);

  const pillars = [
    { icon: <Award size={22} color="var(--accent-orange)" />, title: t('pillars.rules.title'), desc: t('pillars.rules.desc') },
    { icon: <Shield size={22} color="var(--accent-cyan)" />, title: t('pillars.shield.title'), desc: t('pillars.shield.desc') },
    { icon: <Users size={22} color="var(--accent-green)" />, title: t('pillars.hype.title'), desc: t('pillars.hype.desc') },
    { icon: <HeartHandshake size={22} color="var(--accent-orange)" />, title: t('trust.title'), desc: t('trust.body') },
  ];

  return (
    <div className="landing-preview">
      {/* ---------------- Hero ---------------- */}
      <section className="container landing-hero">
        {/*
          Deliberately not a framer-motion entrance. An `initial={{opacity:0}}`
          ships the headline, subtitle and CTA to the browser invisible and only
          reveals them once JS hydrates — on the public landing page that means
          a blank hero for anyone on a slow connection, and for crawlers that do
          not run scripts. The CSS class below animates transform only, so the
          text is legible from first paint.
        */}
        <div className="rise-in">
          <div className="badge badge-fire landing-badge">
            <Flame size={16} /> {t('hero.badge')}
          </div>

          <h1 className="h-hero landing-title">
            {t('hero.titleLead')}{' '}
            <span className="landing-title-accent">{t('hero.titleAccent')}</span>
          </h1>

          <p className="landing-subtitle">{t('hero.subtitle')}</p>

          <div className="landing-cta">
            <Link href="/join" className="btn btn-primary btn-lg pulse-active landing-cta-btn">
              {t('hero.cta')} <ArrowRight size={20} />
            </Link>
            {/* The shared finish line — what makes this a group effort. */}
            <p className="landing-cta-sub">{t('hero.goal', { deadline })}</p>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ----------------
          Carries the tinted band, so the page alternates
          hero (bare) → how it works (band) → feed (bare). */}
      <section className="landing-band">
        <div className="container landing-section">
          <div className="landing-section-head">
            <span className="landing-eyebrow">{t('howItWorks.eyebrow')}</span>
            <h2 className="h-section">{t('howItWorks.title')}</h2>
            <p className="landing-section-lede">{t('howItWorks.lede')}</p>
          </div>

          <div className="card-grid landing-pillars">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="glass-card pillar-card">
                <div className="pillar-card-head">
                  {pillar.icon}
                  <h3 className="pillar-card-title">{pillar.title}</h3>
                </div>
                <p className="pillar-card-body">{pillar.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA 2 of 3 — the reader now knows what they would be signing up
              for, which is the first moment the button means anything. */}
          <div className="landing-midcta">
            <Link href="/join" className="btn btn-primary btn-lg landing-cta-btn">
              {t('hero.cta')} <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Feed preview ---------------- */}
      <section className="container landing-section">
          <div className="landing-section-head">
            <span className="landing-eyebrow">{t('preview.eyebrow')}</span>
            <h2 className="h-section">{t('preview.title')}</h2>
            <p className="landing-section-lede">{t('preview.subtitle')}</p>
          </div>

          <div className="stack" aria-hidden="true">
            {STATIC_MOCK_FEED_POSTS.map((post) => {
              const caption = localizedCaption(post, locale);
              const rules = localizedRules(post, locale);

              return (
                <div key={post.id} className="glass-card preview-card">
                  <div className="preview-card-head">
                    <div>
                      <h4 className="preview-card-name">{post.user.display_name}</h4>
                      <span className="preview-card-meta">
                        @{post.user.username} • {t('feed.dayOf75', { day: post.day_number })}
                      </span>
                    </div>
                    {/* Same icon-first treatment as the real feed card, so the
                        preview matches what a visitor will actually see. */}
                    <span
                      className={`badge badge-status ${
                        post.status === 'completed' ? 'badge-success' : 'badge-shield'
                      }`}
                      title={post.status === 'completed' ? t('feed.statusCompleted') : t('feed.statusShielded')}
                    >
                      {post.status === 'completed' ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
                      <span className="badge-status-text">
                        {post.status === 'completed' ? t('feed.statusCompleted') : t('feed.statusShielded')}
                      </span>
                    </span>
                  </div>

                  {caption && <p className="preview-card-caption">“{caption}”</p>}

                  {post.photo_url && (
                    <div className="preview-card-photo">
                      {/* Static sample assets, so next/image can optimize them. */}
                      <Image
                        src={post.photo_url}
                        alt=""
                        fill
                        sizes="(max-width: 820px) 100vw, 780px"
                        style={{ objectFit: 'cover' }}
                      />
                      <span className="badge preview-card-sample">{t('preview.sampleBadge')}</span>
                    </div>
                  )}

                  <div className="preview-card-rules">
                    {rules.map((rule, idx) => (
                      <span key={idx} className="rule-chip">
                        <CheckCircle2 size={14} color="var(--accent-green)" />
                        {rule}
                      </span>
                    ))}
                  </div>

                  <div className="preview-card-reactions">
                    <span className="btn btn-secondary btn-sm reaction-chip">
                      <Sparkles size={14} /> {post.hypeCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA 3 of 3 — closes the page. The old bare closing section is
              folded in here: it had no heading of its own and read as a button
              floating in space. */}
          <div className="landing-closing">
            <Link href="/join" className="btn btn-primary btn-lg landing-cta-btn">
              {t('hero.cta')} <ArrowRight size={20} />
            </Link>
          </div>
      </section>
    </div>
  );
}
