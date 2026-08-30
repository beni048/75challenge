'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Rule } from '@/lib/streak-engine';
import { compressImageToWebP } from '@/lib/image-compressor';
import { Check, Upload, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';

export interface DailyCheckInSubmission {
  status: 'completed';
  /** Which day this submission is for — the picker can move it off today. */
  logDate: string;
  caption: string | null;
  /**
   * The compressed image itself, not a URL. The page uploads it to Storage and
   * persists the durable URL it gets back — a `blob:` preview URL would be dead
   * by the next page load.
   */
  photoBlob: Blob | null;
  ruleChecks: { ruleId: string; isCompleted: boolean }[];
}

interface DailyChecklistProps {
  rules: Rule[];
  logDate: string;
  saving?: boolean;
  onSaveLog: (submission: DailyCheckInSubmission) => void;
  onReportFailure?: (logDate: string) => void;
}

export default function DailyChecklist({
  rules,
  logDate,
  saving = false,
  onSaveLog,
  onReportFailure,
}: DailyChecklistProps) {
  const { t } = useI18n();
  // Everything starts ticked: the common case by far is "I did my day", so
  // the form opens in that state and unticking is the exception. The parent
  // remounts this per day (key={logDate}), so the initialiser re-runs whenever
  // the selected day changes.
  const [completedRuleIds, setCompletedRuleIds] = useState<string[]>(() =>
    rules.map((r) => r.id)
  );
  const [caption, setCaption] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);

  // Object URLs are a manually-managed resource: without this the browser holds
  // the decoded image in memory for the lifetime of the document.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = photo?.previewUrl ?? null;
  }, [photo]);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

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
      // Release the previous preview before replacing it.
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      setPhoto({ blob: result.blob, previewUrl: result.previewUrl });
      setCompressionStats(
        t('checklist.compressionStats', {
          before: result.originalSizeKB,
          after: result.compressedSizeKB,
        })
      );
    } catch (err) {
      console.error('Image compression error:', err);
      setCompressionStats(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const allRulesDone = rules.length > 0 && completedRuleIds.length === rules.length;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    // Submitting is only ever "I finished today". An unfinished day is reported
    // through the separate missed-day button, which opens the shield prompt —
    // we never quietly record a partial day.
    if (!allRulesDone) {
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
      status: 'completed',
      logDate,
      caption: caption.trim() || null,
      photoBlob: photo?.blob ?? null,
      ruleChecks: rules.map((r) => ({
        ruleId: r.id,
        isCompleted: completedRuleIds.includes(r.id),
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
            <span>{photo ? t('checklist.photoChange') : t('checklist.photoUpload')}</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
              disabled={isCompressing || saving}
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

        {photo && (
          <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: '240px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview
                of a just-compressed blob: URL; nothing for next/image to optimize. */}
            <img src={photo.previewUrl} alt={t('checklist.photoAlt')} style={{ width: '100%', height: 'auto', display: 'block' }} />
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
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: '1 1 200px', padding: '0.9rem 1.5rem', fontWeight: 700 }}
          disabled={!allRulesDone || saving}
        >
          <Sparkles size={18} />
          {saving ? t('common.saving') : t('checklist.submitComplete')}
        </button>

        {onReportFailure && (
          <button
            type="button"
            onClick={() => onReportFailure(logDate)}
            className="btn btn-danger"
            style={{ padding: '0.9rem 1.2rem' }}
            disabled={saving}
          >
            <AlertTriangle size={16} /> {t('checklist.reportMissed')}
          </button>
        )}
      </div>
    </form>
  );
}
