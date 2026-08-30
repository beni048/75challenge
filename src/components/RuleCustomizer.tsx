'use client';

import React, { useState } from 'react';
import { Rule, ScheduleType } from '@/lib/streak-engine';
import { Plus, Trash2, AlertCircle, Lightbulb, Lock, Unlock } from 'lucide-react';
import { useI18n, TranslationKey, translate, Locale } from '@/lib/i18n';
import { MIN_RULES, MAX_RULES, canAddRule } from '@/lib/rules-policy';
import InfoTooltip from './InfoTooltip';

/** Rule ids are stable; only the title is localized at creation time. */
const DEFAULT_RULE_KEYS: { id: string; key: TranslationKey }[] = [
  { id: 'rule-1', key: 'rules.default.workouts' },
  { id: 'rule-2', key: 'rules.default.water' },
  { id: 'rule-3', key: 'rules.default.read' },
  { id: 'rule-4', key: 'rules.default.diet' },
  { id: 'rule-5', key: 'rules.default.alcohol' },
];

/**
 * The starter set, written in the given language. These are a *suggestion*:
 * every title is editable in place, so nobody has to delete a default before
 * they can describe their own habit.
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
  /** Hides the heading when the surrounding step already provides one. */
  hideHeading?: boolean;
}

export default function RuleCustomizer({ rules, onChange, hideHeading = false }: RuleCustomizerProps) {
  const { t, locale } = useI18n();
  const [newRuleTitle, setNewRuleTitle] = useState('');

  const weekdays = WEEKDAY_LABELS[locale] ?? WEEKDAY_LABELS.en;
  const atMax = !canAddRule(rules.length);

  const handleAddRule = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newRuleTitle.trim() || atMax) return;

    onChange([
      ...rules,
      { id: `custom-rule-${Date.now()}`, title: newRuleTitle.trim(), schedule_type: 'daily' },
    ]);
    setNewRuleTitle('');
  };

  /** Edits a habit's wording in place — no delete-then-retype dance. */
  const handleRenameRule = (id: string, title: string) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, title } : r)));
  };

  const handleDeleteRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  };

  const handleToggleSecret = (id: string) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, is_secret: !r.is_secret } : r)));
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
    <div className="stack">
      {!hideHeading && (
        <div className="split">
          <div>
            <h4 className="h-section" style={{ marginBottom: '0.2rem' }}>
              {t('rules.heading')}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('rules.subheading', { min: MIN_RULES, max: MAX_RULES })}
            </p>
          </div>
          <span
            className={`badge ${rules.length >= MIN_RULES ? 'badge-success' : 'badge-fire'}`}
            id="active-rules-count-badge"
          >
            {rules.length === 1
              ? t('rules.countOne', { count: rules.length })
              : t('rules.countMany', { count: rules.length })}
          </span>
        </div>
      )}

      {/* Nudge towards a set that covers more than one area of life. */}
      <div className="notice notice-info">
        <Lightbulb size={18} style={{ flexShrink: 0 }} />
        <span>{t('rules.recommendation')}</span>
      </div>

      <p className="secret-hint">
        <Lock size={14} />
        <span>{t('rules.secretExplain')}</span>
        <InfoTooltip label={t('rules.secretInfoLabel')} text={t('rules.secretInfoText')} />
      </p>

      {rules.length < MIN_RULES && (
        <div className="notice notice-warn">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{t('rules.minWarning', { min: MIN_RULES })}</span>
        </div>
      )}

      {/* Habit list — every title is an input, editable in place. */}
      <div className="stack stack-tight">
        {rules.map((rule, idx) => (
          <div key={rule.id} className="rule-row">
            <div className="rule-row-head">
              <span className="rule-index" aria-hidden="true">
                {idx + 1}
              </span>

              <input
                type="text"
                className="input-field rule-title-input"
                value={rule.title}
                onChange={(e) => handleRenameRule(rule.id, e.target.value)}
                placeholder={t('rules.titlePlaceholder')}
                aria-label={t('rules.titleLabel', { index: idx + 1 })}
              />

              <button
                type="button"
                onClick={() => handleToggleSecret(rule.id)}
                className="icon-btn"
                aria-pressed={Boolean(rule.is_secret)}
                title={rule.is_secret ? t('rules.secretOn') : t('rules.secretOff')}
                aria-label={rule.is_secret ? t('rules.secretOn') : t('rules.secretOff')}
              >
                {rule.is_secret ? <Lock size={16} color="var(--accent-orange)" /> : <Unlock size={16} />}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteRule(rule.id)}
                className="rule-delete"
                title={t('rules.remove')}
                aria-label={t('rules.removeNamed', { title: rule.title })}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="rule-row-schedule">
              <div className="rule-schedule-buttons">
                {(['daily', 'workdays', 'custom'] as ScheduleType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUpdateSchedule(rule.id, type)}
                    className={`btn btn-sm ${rule.schedule_type === type ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {scheduleLabel(type)}
                  </button>
                ))}
              </div>

              {rule.schedule_type === 'custom' && (
                <div className="rule-weekdays">
                  {weekdays.map((label, day) => {
                    const isSelected = (rule.custom_days || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(rule.id, day)}
                        aria-pressed={isSelected}
                        className={`weekday-toggle${isSelected ? ' is-selected' : ''}`}
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

      {atMax ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {t('rules.maxWarning', { max: MAX_RULES })}
        </p>
      ) : (
        <form onSubmit={handleAddRule} className="stack stack-tight stack-row-sm">
          <input
            type="text"
            placeholder={t('rules.addPlaceholder')}
            value={newRuleTitle}
            onChange={(e) => setNewRuleTitle(e.target.value)}
            className="input-field"
            style={{ flex: 1, minWidth: 0 }}
            id="new-rule-input"
            data-testid="new-rule-input"
          />
          <button type="submit" className="btn btn-secondary btn-block" id="add-rule-btn">
            <Plus size={16} /> {t('rules.add')}
          </button>
        </form>
      )}
    </div>
  );
}
