'use client';

import React, { useState } from 'react';
import { Rule, DailyLog } from '@/lib/streak-engine';
import { compressImageToWebP } from '@/lib/image-compressor';
import { getEffectiveLogDate } from '@/lib/date-utils';
import { Check, Upload, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';

interface DailyChecklistProps {
  rules: Rule[];
  logDate?: string;
  existingLog?: DailyLog;
  onSaveLog: (log: DailyLog) => void;
  onReportFailure?: (logDate: string) => void;
}

export default function DailyChecklist({
  rules,
  logDate = getEffectiveLogDate(),
  existingLog,
  onSaveLog,
  onReportFailure,
}: DailyChecklistProps) {
  const { t } = useI18n();
  const [completedRuleIds, setCompletedRuleIds] = useState<string[]>(
    existingLog?.rule_checks?.filter((c) => c.is_completed).map((c) => c.rule_id) || []
  );
  const [caption, setCaption] = useState(existingLog?.caption || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingLog?.photo_url || null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);

  const toggleRule = (ruleId: string) => {
    setCompletedRuleIds((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const result = await compressImageToWebP(file);
      setPhotoPreview(result.previewUrl);
      setCompressionStats(
        t('checklist.compressionStats', {
          before: result.originalSizeKB,
          after: result.compressedSizeKB,
        })
      );
    } catch (err) {
      console.error('Image compression error:', err);
      alert(t('checklist.compressionFailed'));
    } finally {
      setIsCompressing(false);
    }
  };

  const allRulesDone = rules.length > 0 && completedRuleIds.length === rules.length;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    // An incomplete day is never recorded silently — the user decides whether it
    // counts as missed, and the shield prompt takes over from there.
    if (!allRulesDone) {
      if (!confirm(t('checklist.confirmIncomplete'))) return;
      onReportFailure?.(logDate);
      return;
    }

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#00e5ff', '#ff5a1f'],
    });

    onSaveLog({
      log_date: logDate,
      status: 'completed',
      photo_url: photoPreview,
      caption: caption.trim() || null,
      rule_checks: rules.map((r) => ({
        rule_id: r.id,
        is_completed: completedRuleIds.includes(r.id),
      })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card"
      style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{t('checklist.title')}</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t('checklist.loggingFor', { date: logDate })}
          </p>
        </div>

        <span className={`badge ${allRulesDone ? 'badge-success' : 'badge-fire'}`} style={{ fontSize: '0.75rem' }}>
          {t('checklist.progress', { done: completedRuleIds.length, total: rules.length })}
        </span>
      </div>

      {/* Rule checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {rules.map((rule) => {
          const isDone = completedRuleIds.includes(rule.id);
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => toggleRule(rule.id)}
              aria-pressed={isDone}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isDone ? 'var(--accent-green-soft)' : 'var(--bg-tertiary)',
                border: isDone ? '1px solid var(--accent-green-soft-border)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
                transition: 'all 0.18s ease',
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  flexShrink: 0,
                  borderRadius: '6px',
                  border: isDone ? 'none' : '2px solid var(--border-medium)',
                  backgroundColor: isDone ? 'var(--accent-green)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-on-accent)',
                }}
              >
                {isDone && <Check size={16} strokeWidth={3} />}
              </span>

              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}
              >
                {rule.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Proof photo, compressed client-side to WebP */}
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">{t('checklist.photoLabel')}</label>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            className="btn btn-secondary btn-sm"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Upload size={16} />
            <span>{photoPreview ? t('checklist.photoChange') : t('checklist.photoUpload')}</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
              disabled={isCompressing}
            />
          </label>

          {isCompressing && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-orange)' }}>
              {t('checklist.compressing')}
            </span>
          )}

          {compressionStats && !isCompressing && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)' }}>✓ {compressionStats}</span>
          )}
        </div>

        {photoPreview && (
          <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: '240px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview
                of a just-compressed blob: URL; nothing for next/image to optimize. */}
            <img src={photoPreview} alt={t('checklist.photoAlt')} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="log-caption">
          {t('checklist.captionLabel')}
        </label>
        <textarea
          id="log-caption"
          className="input-field"
          rows={2}
          placeholder={t('checklist.captionPlaceholder')}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: '1 1 200px', padding: '0.9rem 1.5rem', fontWeight: 700 }}>
          <Sparkles size={18} />
          {allRulesDone ? t('checklist.submitComplete') : t('checklist.submitPartial')}
        </button>

        {onReportFailure && (
          <button
            type="button"
            onClick={() => onReportFailure(logDate)}
            className="btn btn-danger"
            style={{ padding: '0.9rem 1.2rem' }}
          >
            <AlertTriangle size={16} /> {t('checklist.reportMissed')}
          </button>
        )}
      </div>
    </form>
  );
}
