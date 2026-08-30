'use client';

/**
 * Three-slot day picker: previous, current, next.
 *
 * Visual language follows the reference screenshot — a rounded pill per day
 * carrying the weekday, the day-of-month and a status dot, with the selected
 * day outlined solid and a not-yet-reachable day outlined dashed. The
 * reference showed a full week; three slots is a deliberate narrowing so the
 * targets stay comfortably over 44px at 360px width (§12).
 *
 * This component is presentational — it owns no dates of its own. The parent
 * holds `selectedDate` because the check-in form below has to agree with it.
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { parseDate } from '@/lib/date-utils';

export type DayState = 'completed' | 'shielded' | 'missed' | 'open' | 'future';

export interface DaySlot {
  date: string;
  /** 1-75, or null for a date outside the challenge window. */
  dayNumber: number | null;
  state: DayState;
}

interface DayWindowProps {
  slots: DaySlot[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onStep: (direction: -1 | 1) => void;
  canStepBack: boolean;
  canStepForward: boolean;
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function DayWindow({
  slots,
  selectedDate,
  onSelect,
  onStep,
  canStepBack,
  canStepForward,
}: DayWindowProps) {
  const { t } = useI18n();

  const weekdayLabel = (date: string) => {
    const key = WEEKDAY_KEYS[parseDate(date).getDay()];
    return t(`weekday.${key}` as `weekday.${(typeof WEEKDAY_KEYS)[number]}`);
  };

  const selected = slots.find((s) => s.date === selectedDate);

  return (
    <div className="day-window">
      <div className="day-window-head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onStep(-1)}
          disabled={!canStepBack}
          aria-label={t('dayWindow.previous')}
        >
          <ChevronLeft size={18} />
        </button>

        <span className="day-window-title">
          {selected?.dayNumber
            ? t('dayWindow.dayOf', { day: selected.dayNumber })
            : t('dayWindow.outsideChallenge')}
        </span>

        <button
          type="button"
          className="icon-btn"
          onClick={() => onStep(1)}
          disabled={!canStepForward}
          aria-label={t('dayWindow.next')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="day-window-slots" role="tablist" aria-label={t('dayWindow.legend')}>
        {slots.map((slot) => {
          const isSelected = slot.date === selectedDate;
          // A future day has nothing to show yet, so it is inert rather than
          // merely styled differently — matching the dashed outline in the
          // reference, which reads as "not yet".
          const disabled = slot.state === 'future';

          return (
            <button
              key={slot.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => onSelect(slot.date)}
              className={`day-slot is-${slot.state}${isSelected ? ' is-selected' : ''}`}
            >
              <span className="day-slot-weekday">{weekdayLabel(slot.date)}</span>
              <span className="day-slot-number">{parseDate(slot.date).getDate()}</span>
              <span className="day-slot-dot" aria-hidden="true">
                {slot.state === 'completed' || slot.state === 'shielded' ? (
                  <Check size={12} strokeWidth={3} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
