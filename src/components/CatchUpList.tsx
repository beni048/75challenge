'use client';

/**
 * A single-tap catch-up for past days that were never logged. Deliberately
 * not a per-rule breakdown like DailyChecklist — that's only for today;
 * catching up applies today's current rule set retroactively as a whole
 * (rules have no history/valid-from tracking, so there is no other set to
 * apply). Selecting several days and submitting once writes them all under
 * one shared batch, so the feed shows one aggregated post, not N.
 */

import React, { useState } from 'react';
import { CalendarCheck, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CatchUpListProps {
  pendingDates: string[];
  busy: boolean;
  onCatchUp: (dates: string[]) => void;
  onReportMissed: (date: string) => void;
}

export default function CatchUpList({ pendingDates, busy, onCatchUp, onReportMissed }: CatchUpListProps) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(pendingDates));

  if (pendingDates.length === 0) return null;

  const toggle = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const formatShort = (date: string) =>
    new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : 'en-GB', { day: 'numeric', month: 'short' }).format(
      new Date(`${date}T12:00:00`)
    );

  const selectedDates = pendingDates.filter((date) => selected.has(date));

  return (
    <div className="glass-card stack" style={{ padding: '1.25rem' }}>
      <div className="notice notice-info">
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span>
          {pendingDates.length === 1
            ? t('catchup.explainOne')
            : t('catchup.explainMany', { count: pendingDates.length })}
        </span>
      </div>

      <ul className="stack stack-tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {pendingDates.map((date) => (
          <li
            key={date}
            className="glass-card"
            style={{ padding: '0.7rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={selected.has(date)} onChange={() => toggle(date)} />
              {formatShort(date)}
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onReportMissed(date)}
              disabled={busy}
            >
              {t('catchup.reportMissed')}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={busy || selectedDates.length === 0}
        onClick={() => onCatchUp(selectedDates)}
      >
        <CalendarCheck size={16} />
        {busy
          ? t('common.saving')
          : selectedDates.length === 1
            ? t('catchup.submitOne')
            : t('catchup.submitMany', { count: selectedDates.length })}
      </button>
    </div>
  );
}
