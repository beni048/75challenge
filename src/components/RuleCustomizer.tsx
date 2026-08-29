'use client';

import React, { useState } from 'react';
import { Rule, ScheduleType } from '@/lib/streak-engine';
import { Plus, Trash2, Check, Calendar, AlertCircle } from 'lucide-react';

export const DEFAULT_75_HARD_RULES: Rule[] = [
  { id: 'rule-1', title: '2x 45-min workouts (1 outdoors)', schedule_type: 'daily' },
  { id: 'rule-2', title: 'Drink 4 Liters of Water', schedule_type: 'daily' },
  { id: 'rule-3', title: 'Read 10 Pages (Non-fiction / Growth)', schedule_type: 'daily' },
  { id: 'rule-4', title: 'Follow Clean Diet (No Cheat Meals)', schedule_type: 'daily' },
  { id: 'rule-5', title: 'Zero Alcohol', schedule_type: 'daily' },
];

const WEEKDAYS = [
  { label: 'S', day: 0 },
  { label: 'M', day: 1 },
  { label: 'T', day: 2 },
  { label: 'W', day: 3 },
  { label: 'T', day: 4 },
  { label: 'F', day: 5 },
  { label: 'S', day: 6 },
];

interface RuleCustomizerProps {
  rules: Rule[];
  onChange: (updatedRules: Rule[]) => void;
}

export default function RuleCustomizer({ rules, onChange }: RuleCustomizerProps) {
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<ScheduleType>('daily');
  const [newCustomDays, setNewCustomDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri default

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;

    const newRule: Rule = {
      id: `custom-rule-${Date.now()}`,
      title: newRuleTitle.trim(),
      schedule_type: newScheduleType,
      custom_days: newScheduleType === 'custom' ? newCustomDays : undefined,
    };

    onChange([...rules, newRule]);
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
          : [...currentDays, dayNumber].sort();
        return { ...r, custom_days: nextDays };
      })
    );
  };

  return (
    <div className="rule-customizer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Configure Your 75-Day Rule Set</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Minimum 2 rules required. Tailor daily frequency or pick specific weekdays.
          </p>
        </div>
        <span
          className={`badge ${rules.length >= 2 ? 'badge-success' : 'badge-fire'}`}
          id="active-rules-count-badge"
        >
          {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'} Active
        </span>
      </div>

      {rules.length < 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(255, 90, 31, 0.12)',
            border: '1px solid rgba(255, 90, 31, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-orange-light)',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={18} />
          <span>You must configure at least 2 active rules to start your challenge.</span>
        </div>
      )}

      {/* Rules List */}
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
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 90, 31, 0.15)',
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
                title="Remove rule"
                aria-label={`Remove rule ${rule.title}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Schedule Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['daily', 'workdays', 'custom'] as ScheduleType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUpdateSchedule(rule.id, type)}
                    className={`btn btn-sm ${rule.schedule_type === type ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                  >
                    {type === 'daily' ? '7 Days / Week' : type === 'workdays' ? 'Mon-Fri' : 'Custom Days'}
                  </button>
                ))}
              </div>

              {rule.schedule_type === 'custom' && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {WEEKDAYS.map((w) => {
                    const isSelected = (rule.custom_days || []).includes(w.day);
                    return (
                      <button
                        key={w.day}
                        type="button"
                        onClick={() => handleToggleDay(rule.id, w.day)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-medium)',
                          background: isSelected ? 'var(--accent-orange)' : 'var(--bg-tertiary)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Rule Bar */}
      <form onSubmit={handleAddRule} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          type="text"
          placeholder="Add custom rule (e.g., Cold plunge 3 min, 100 pushups)..."
          value={newRuleTitle}
          onChange={(e) => setNewRuleTitle(e.target.value)}
          className="input-field"
          style={{ flex: 1 }}
          id="new-rule-input"
        />
        <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} id="add-rule-btn">
          <Plus size={16} /> Add Rule
        </button>
      </form>
    </div>
  );
}
