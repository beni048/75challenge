'use client';

import React from 'react';
import { generate75DayDates, getEffectiveLogDate } from '@/lib/date-utils';
import { DailyLog } from '@/lib/streak-engine';
import { Check, Shield, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ConsistencyHeatmapProps {
  startDate: string;
  logs: DailyLog[];
  currentDay: number;
}

export default function ConsistencyHeatmap({ startDate, logs, currentDay }: ConsistencyHeatmapProps) {
  const { t } = useI18n();
  const dates = generate75DayDates(startDate);
  const effectiveToday = getEffectiveLogDate();

  const logsMap = new Map<string, DailyLog>();
  logs.forEach((log) => logsMap.set(log.log_date, log));

  const legend = [
    { color: 'var(--accent-green)', label: t('heatmap.legendDone') },
    { color: 'var(--accent-cyan)', label: t('heatmap.legendShielded') },
    { color: 'var(--danger-legend)', label: t('heatmap.legendMissed') },
    { color: 'var(--chip-bg-strong)', label: t('heatmap.legendUpcoming') },
  ];

  return (
    <div className="glass-card" style={{ padding: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ fontSize: '1.15rem' }}>{t('heatmap.title')}</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('heatmap.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          {legend.map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '0.4rem' }}>
        {dates.map((dateStr, index) => {
          const dayNum = index + 1;
          const log = logsMap.get(dateStr);
          const isToday = dateStr === effectiveToday;
          const isPast = dayNum < currentDay;
          const isFuture = dayNum > currentDay;

          let bgColor = 'var(--grid-empty)';
          let borderColor = 'var(--border-subtle)';
          let icon = null;
          let statusLabel = isFuture ? t('heatmap.statusUpcoming') : t('heatmap.statusPending');

          if (log?.status === 'completed') {
            bgColor = 'var(--accent-green-soft)';
            borderColor = 'var(--accent-green)';
            icon = <Check size={14} color="var(--accent-green)" />;
            statusLabel = t('heatmap.statusCompleted');
          } else if (log?.status === 'shielded') {
            bgColor = 'var(--accent-cyan-soft)';
            borderColor = 'var(--accent-cyan)';
            icon = <Shield size={13} color="var(--accent-cyan)" />;
            statusLabel = t('heatmap.statusShielded');
          } else if (isPast && (!log || log.status === 'failed')) {
            bgColor = 'var(--danger-cell)';
            borderColor = 'var(--danger-cell-border)';
            icon = <X size={14} color="var(--danger)" />;
            statusLabel = t('heatmap.statusFailed');
          }

          return (
            <div
              key={dateStr}
              title={t('heatmap.tooltip', { day: dayNum, date: dateStr, status: statusLabel })}
              style={{
                aspectRatio: '1/1',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: bgColor,
                border: isToday ? '2px solid var(--accent-orange)' : `1px solid ${borderColor}`,
                boxShadow: isToday ? '0 0 10px var(--accent-orange-glow)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: isToday ? 'var(--accent-orange-light)' : 'var(--text-muted)',
                cursor: 'default',
              }}
            >
              <span>{dayNum}</span>
              {icon && <div style={{ marginTop: '1px' }}>{icon}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
