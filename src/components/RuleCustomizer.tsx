'use client';

import React, { useState } from 'react';
import { Rule, ScheduleType } from '@/lib/streak-engine';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useI18n, TranslationKey, translate, Locale } from '@/lib/i18n';

/** Rule ids are stable; only the title is localized at creation time. */
const DEFAULT_RULE_KEYS: { id: string; key: TranslationKey }[] = [
  { id: 'rule-1', key: 'rules.default.workouts' },
  { id: 'rule-2', key: 'rules.default.water' },
  { id: 'rule-3', key: 'rules.default.read' },
  { id: 'rule-4', key: 'rules.default.diet' },
  { id: 'rule-5', key: 'rules.default.alcohol' },
];

/**
 * The 75 Hard starter set, written in the given language. Titles become user
 * data once saved, so they are not re-translated afterwards.
 */
export function getDefaultRules(locale: Locale): Rule[] {
  return DEFAULT_RULE_KEYS.map(({ id, key }) => ({
    id,
    title: translate(locale, key),
    schedule_type: 'daily' as ScheduleType,
  }));
}

/** English starter set, kept for non-localized callers and tests. */
export const DEFAULT_75_HARD_RULES: Rule[] = getDefaultRules('en');

const WEEKDAY_LABELS: Record<Locale, string[]> = {
  // Sunday-first, matching JavaScript's getDay().
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
};

interface RuleCustomizerProps {
  rules: Rule[];
  onChange: (updatedRules: Rule[]) => void;
}

export default function RuleCustomizer({ rules, onChange }: RuleCustomizerProps) {
  const { t, locale } = useI18n();
  const [newRuleTitle, setNewRuleTitle] = useState('');

  const weekdays = WEEKDAY_LABELS[locale] ?? WEEKDAY_LABELS.en;

  const handleAddRule = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;

    onChange([
      ...rules,
      {
        id: `custom-rule-${Date.now()}`,
        title: newRuleTitle.trim(),
        schedule_type: 'daily',
      },
    ]);
    setNewRuleTitle('');
  };

  const handleDeleteRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  };

  const handleUpdateSchedule = (id: string, type: ScheduleType) => {
    onChange(
      rules.map((r) =>
        r.id === id
          ? { ...r, schedule_type: type, custom_days: type === 'custom' ? [1, 2, 3, 4, 5] : undefined }
          : r
      )
    );
  };

  const handleToggleDay = (ruleId: string, dayNumber: number) => {
    onChange(
      rules.map((r) => {
        if (r.id !== ruleId) return r;
        const currentDays = r.custom_days || [];
        const nextDays = currentDays.includes(dayNumber)
          ? currentDays.filter((d) => d !== dayNumber)
          : [...currentDays, dayNumber].sort((a, b) => a - b);
        return { ...r, custom_days: nextDays };
      })
    );
  };

  const scheduleLabel = (type: ScheduleType) =>
    type === 'daily'
      ? t('rules.scheduleDaily')
      : type === 'workdays'
        ? t('rules.scheduleWorkdays')
        : t('rules.scheduleCustom');

  return (
    <div className="rule-customizer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{t('rules.heading')}</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('rules.subheading')}</p>
        </div>
        <span
          className={`badge ${rules.length >= 2 ? 'badge-success' : 'badge-fire'}`}
          id="active-rules-count-badge"
        >
          {rules.length === 1
            ? t('rules.countOne', { count: rules.length })
            : t('rules.countMany', { count: rules.length })}
        </span>
      </div>

      {rules.length < 2 && (
        <div className="notice notice-warn">
          <AlertCircle size={18} />
          <span>{t('rules.minWarning')}</span>
        </div>
      )}

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className="glass-card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    flexShrink: 0,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-orange-soft)',
                    color: 'var(--accent-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{rule.title}</span>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRule(rule.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={t('rules.remove')}
                aria-label={t('rules.removeNamed', { title: rule.title })}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Schedule selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {(['daily', 'workdays', 'custom'] as ScheduleType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUpdateSchedule(rule.id, type)}
                    className={`btn btn-sm ${rule.schedule_type === type ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {scheduleLabel(type)}
                  </button>
                ))}
              </div>

              {rule.schedule_type === 'custom' && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {weekdays.map((label, day) => {
                    const isSelected = (rule.custom_days || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(rule.id, day)}
                        aria-pressed={isSelected}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-medium)',
                          background: isSelected ? 'var(--accent-orange)' : 'var(--bg-tertiary)',
                          color: isSelected ? 'var(--text-on-accent)' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new rule */}
      <form onSubmit={handleAddRule} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={t('rules.addPlaceholder')}
          value={newRuleTitle}
          onChange={(e) => setNewRuleTitle(e.target.value)}
          className="input-field"
          style={{ flex: '1 1 220px' }}
          id="new-rule-input"
        />
        <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} id="add-rule-btn">
          <Plus size={16} /> {t('rules.add')}
        </button>
      </form>
    </div>
  );
}
