'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { parseDate, formatLongDate } from '@/lib/date-utils';

/** Shown instead of a checklist while a challenge's start date is still ahead. */
export default function StartCountdown({ startDate, today }: { startDate: string; today: string }) {
  const { t, locale } = useI18n();

  const days = Math.round((parseDate(startDate).getTime() - parseDate(today).getTime()) / 86_400_000);

  return (
    <div className="glass-card state-card" style={{ textAlign: 'center' }}>
      <CalendarClock size={32} color="var(--accent-orange)" style={{ marginBottom: '0.75rem' }} />
      <h3 className="h-page" style={{ marginBottom: '0.35rem' }}>
        {days === 1 ? t('countdown.dayOne') : t('countdown.days', { count: days })}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        {t('countdown.startsOn', { date: formatLongDate(startDate, locale) })}
      </p>
      <Link href="/feed" className="btn btn-secondary">
        {t('countdown.browseFeed')}
      </Link>
    </div>
  );
}
