'use client';

/**
 * Lets the owner choose which habits appear on their shareable card.
 *
 * The card is a fixed 9:16 export — showing all of somebody's habits (up to
 * MAX_RULES = 11) either overflowed the card or forced the old silent
 * `.slice(0, 4)`, which always picked the first four regardless of which ones
 * the person actually wanted to show off. This makes that choice explicit.
 *
 * Skipped entirely by the caller when there are MAX_CARD_HABITS or fewer
 * habits to begin with — nothing to choose among.
 */

import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface HabitPickerRule {
  id: string;
  title: string;
}

interface HabitPickerProps {
  rules: HabitPickerRule[];
  /** How many must be selected before continuing — MilestoneCard.MAX_CARD_HABITS. */
  max: number;
  onConfirm: (ruleIds: string[]) => void;
}

export default function HabitPicker({ rules, max, onConfirm }: HabitPickerProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= max) return prev; // at the cap — ignore further taps
      return [...prev, id];
    });
  };

  const atCap = selected.length === max;

  return (
    <div className="glass-card stack habit-picker">
      <div>
        <h3 className="h-page">{t('storyPicker.title')}</h3>
        <p className="onboarding-lede">{t('storyPicker.intro', { max })}</p>
      </div>

      <ul className="habit-picker-list">
        {rules.map((rule) => {
          const checked = selected.includes(rule.id);
          const disabled = !checked && atCap;
          return (
            <li key={rule.id}>
              <button
                type="button"
                className={`habit-picker-item${checked ? ' is-selected' : ''}`}
                onClick={() => toggle(rule.id)}
                disabled={disabled}
                aria-pressed={checked}
              >
                {checked ? (
                  <CheckCircle2 size={18} color="var(--accent-green)" />
                ) : (
                  <Circle size={18} color="var(--text-muted)" />
                )}
                <span className="habit-picker-item-title">{rule.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        disabled={!atCap}
        onClick={() => onConfirm(selected)}
      >
        {t('storyPicker.confirm', { count: selected.length, max })}
      </button>
    </div>
  );
}
