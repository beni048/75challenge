'use client';

/**
 * Shown in place of the check-in form once the day is settled.
 *
 * A completed day is final — it cannot be reopened or edited. That is
 * deliberate: the whole model runs on self-reported trust, and letting people
 * retroactively rewrite a finished day would turn the streak into a draft.
 */

import React from 'react';
import { CheckCircle2, Circle, ShieldCheck, Moon, CalendarClock, CalendarX } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export type LockedReason = 'completed' | 'shielded' | 'rest-day' | 'future' | 'outside';

const PRESENTATION: Record<
  LockedReason,
  {
    icon: React.ReactNode;
    tint: string;
    titleKey:
      | 'day.doneTitle' | 'day.shieldedTitle' | 'day.restDayTitle'
      | 'day.futureTitle' | 'day.outsideTitle';
    bodyKey:
      | 'day.doneBody' | 'day.shieldedBody' | 'day.restDayBody'
      | 'day.futureBody' | 'day.outsideBody';
  }
> = {
  completed: {
    icon: <CheckCircle2 size={30} />,
    tint: 'var(--accent-green)',
    titleKey: 'day.doneTitle',
    bodyKey: 'day.doneBody',
  },
  shielded: {
    icon: <ShieldCheck size={30} />,
    tint: 'var(--accent-cyan)',
    titleKey: 'day.shieldedTitle',
    bodyKey: 'day.shieldedBody',
  },
  'rest-day': {
    icon: <Moon size={30} />,
    tint: 'var(--accent-purple)',
    titleKey: 'day.restDayTitle',
    bodyKey: 'day.restDayBody',
  },
  // A day that has not arrived yet. Distinct from a rest day: there IS work
  // scheduled, it simply cannot be logged before it happens.
  // Before day 1 or after day 75 — not part of this attempt at all.
  outside: {
    icon: <CalendarX size={30} />,
    tint: 'var(--text-muted)',
    titleKey: 'day.outsideTitle',
    bodyKey: 'day.outsideBody',
  },
  future: {
    icon: <CalendarClock size={30} />,
    tint: 'var(--accent-orange)',
    titleKey: 'day.futureTitle',
    bodyKey: 'day.futureBody',
  },
};

export default function DayLockedCard({
  reason,
  logDate,
  scheduledRules = [],
}: {
  reason: LockedReason;
  logDate: string;
  /**
   * What's on the docket for this day — used for a future day, so someone
   * planning ahead (a schedule with workday-only or custom-day habits) can
   * see what applies without waiting for the day to arrive. Nothing here has
   * been done yet, so it renders with an outline circle, never a checkmark.
   */
  scheduledRules?: string[];
}) {
  const { t } = useI18n();
  const { icon, tint, titleKey, bodyKey } = PRESENTATION[reason];
  const isPreview = reason === 'future';
  // A future rest day (nothing scheduled that day, e.g. a Mon/Wed/Fri-only
  // habit landing on a Tuesday) has no list to point at below — the generic
  // "look below" copy would refer to nothing.
  const resolvedBodyKey = isPreview && scheduledRules.length === 0 ? 'day.futureRestBody' : bodyKey;

  return (
    <div
      className="glass-card"
      style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tint,
          background: 'var(--chip-bg)',
          border: `1px solid ${tint}`,
        }}
      >
        {icon}
      </div>

      <h3 style={{ fontSize: '1.3rem' }}>{t(titleKey)}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '420px' }}>
        {t(resolvedBodyKey, { date: logDate })}
      </p>

      {scheduledRules.length > 0 && (
        <>
          {isPreview && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              {t('day.scheduledLabel')}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.45rem',
              justifyContent: 'center',
              marginTop: isPreview ? 0 : '0.5rem',
            }}
          >
            {scheduledRules.map((rule) => (
              <span
                key={rule}
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
                {isPreview ? (
                  <Circle size={14} color="var(--text-muted)" />
                ) : (
                  <CheckCircle2 size={14} color="var(--accent-green)" />
                )}
                {rule}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
