'use client';

import React, { useRef, useState } from 'react';
import { exportElementAsImage } from '@/lib/export-utils';
import { Flame, Shield, CheckCircle2, Download, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';
import { useToast } from './Toast';

interface MilestoneCardProps {
  displayName: string;
  username: string;
  dayNumber: number;
  completedRules: string[];
  shieldsRemaining: number;
  streakDays: number;
  quote?: string;
}

export default function MilestoneCard({
  displayName,
  username,
  dayNumber,
  completedRules,
  shieldsRemaining,
  streakDays,
  quote,
}: MilestoneCardProps) {
  const { t } = useI18n();
  const toast = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Confetti burst for milestone achievement
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff5a1f', '#00e5ff', '#10b981'],
      });

      await exportElementAsImage(cardRef.current, {
        fileName: `75challenge-day-${dayNumber}-${username}`,
        format: 'png',
      });
    } catch (err) {
      console.error('Failed to export story card:', err);
      toast.error(t('milestone.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const progressPercent = Math.round((dayNumber / 75) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* 9:16 Instagram Story Aspect Ratio Card Container */}
      <div
        ref={cardRef}
        style={{
          width: '340px',
          height: '604px', // exact 9:16 aspect ratio
          backgroundColor: '#0a0c10',
          backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(255, 90, 31, 0.18) 0%, rgba(10, 12, 16, 0.95) 75%)',
          borderRadius: '24px',
          border: '2px solid rgba(255, 90, 31, 0.35)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 90, 31, 0.25)',
          color: '#f8fafc',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Top Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Flame size={20} color="var(--accent-orange)" />
            <span style={{ fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.05em', color: '#fff' }}>
              75 CHALLENGE
            </span>
          </div>

          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Shield size={12} /> {shieldsRemaining > 0 ? t('story.shieldReady') : t('story.shieldUsed')}
          </span>
        </div>

        {/* Hero Progress Center */}
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent-orange)',
              marginBottom: '0.2rem',
            }}
          >
            {t('story.milestone')}
          </div>

          <div
            style={{
              fontSize: '3.75rem',
              fontWeight: 900,
              lineHeight: 1,
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #ffffff 0%, #ff7d4d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('story.day', { day: dayNumber })}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginTop: '0.3rem' }}>
            {t('story.ofDays')}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '999px',
              marginTop: '1rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--gradient-fire)',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>
            <span>{t('story.start')}</span>
            <span>{t('story.percentComplete', { percent: progressPercent })}</span>
            <span>{t('story.finish')}</span>
          </div>
        </div>

        {/* Completed Rules List */}
        <div
          style={{
            backgroundColor: 'rgba(23, 27, 38, 0.75)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            {t('story.rulesToday')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {completedRules.slice(0, 4).map((rule, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                }}
              >
                <CheckCircle2 size={15} color="var(--accent-green)" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Identity */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
          <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
            “{quote ?? t('story.defaultQuote')}”
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{displayName}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            @{username} • {t('story.daysLogged', { count: streakDays })}
          </div>
        </div>
      </div>

      {/* Export Action Trigger */}
      <button
        onClick={handleExport}
        className="btn btn-primary"
        style={{ width: '100%', maxWidth: '340px', padding: '0.85rem' }}
        disabled={isExporting}
        id="export-story-btn"
      >
        {isExporting ? <Sparkles size={18} /> : <Download size={18} />}
        {isExporting ? t('story.exporting') : t('story.export')}
      </button>
    </div>
  );
}
