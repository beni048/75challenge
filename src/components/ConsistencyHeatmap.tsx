'use client';

import React from 'react';
import { generate75DayDates, getEffectiveLogDate } from '@/lib/date-utils';
import { DailyLog } from '@/lib/streak-engine';
import { Check, Shield, X, Circle } from 'lucide-react';

interface ConsistencyHeatmapProps {
  startDate: string;
  logs: DailyLog[];
  currentDay: number;
}

export default function ConsistencyHeatmap({
  startDate,
  logs,
  currentDay,
}: ConsistencyHeatmapProps) {
  const dates = generate75DayDates(startDate);
  const effectiveToday = getEffectiveLogDate();

  const logsMap = new Map<string, DailyLog>();
  logs.forEach((log) => logsMap.set(log.log_date, log));

  return (
    <div className="glass-card" style={{ padding: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ fontSize: '1.15rem' }}>75-Day Discipline Grid</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Every square represents 1 day. Miss none.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-green)' }} /> Done
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-cyan)' }} /> Shielded
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 23, 68, 0.7)' }} /> Missed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.1)' }} /> Upcoming
          </span>
        </div>
      </div>

      {/* Grid: 15 columns x 5 rows = 75 days */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
          gap: '0.4rem',
        }}
      >
        {dates.map((dateStr, index) => {
          const dayNum = index + 1;
          const log = logsMap.get(dateStr);
          const isToday = dateStr === effectiveToday;
          const isPast = dayNum < currentDay;
          const isFuture = dayNum > currentDay;

          let bgColor = 'rgba(255, 255, 255, 0.06)';
          let borderColor = 'var(--border-subtle)';
          let icon = null;

          if (log?.status === 'completed') {
            bgColor = 'rgba(16, 185, 129, 0.25)';
            borderColor = 'var(--accent-green)';
            icon = <Check size={14} color="var(--accent-green)" />;
          } else if (log?.status === 'shielded') {
            bgColor = 'rgba(0, 229, 255, 0.25)';
            borderColor = 'var(--accent-cyan)';
            icon = <Shield size={13} color="var(--accent-cyan)" />;
          } else if (isPast && (!log || log.status === 'failed')) {
            bgColor = 'rgba(255, 23, 68, 0.2)';
            borderColor = 'rgba(255, 23, 68, 0.5)';
            icon = <X size={14} color="#ff5252" />;
          }

          return (
            <div
              key={dateStr}
              title={`Day ${dayNum} (${dateStr}): ${log?.status || (isFuture ? 'Upcoming' : 'Pending')}`}
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
                position: 'relative',
                cursor: 'default',
                transition: 'transform 0.15s',
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
