'use client';

import React, { useState } from 'react';
import { Rule, DailyLog } from '@/lib/streak-engine';
import { compressImageToWebP } from '@/lib/image-compressor';
import { getEffectiveLogDate } from '@/lib/date-utils';
import { Check, Upload, Image as ImageIcon, Flame, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyChecklistProps {
  rules: Rule[];
  logDate?: string;
  existingLog?: DailyLog;
  onSaveLog: (log: DailyLog) => void;
}

export default function DailyChecklist({
  rules,
  logDate = getEffectiveLogDate(),
  existingLog,
  onSaveLog,
}: DailyChecklistProps) {
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
      // Compress in browser via Canvas API to WebP < 200KB
      const result = await compressImageToWebP(file);
      setPhotoPreview(result.previewUrl);
      setCompressionStats(
        `Optimized: ${result.originalSizeKB} KB → ${result.compressedSizeKB} KB (WebP)`
      );
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Could not compress photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const allRulesDone = rules.length > 0 && completedRuleIds.length === rules.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesDone) {
      const confirmIncomplete = confirm(
        'Not all rules are checked off. Saving will mark this day as incomplete/failed unless shielded. Proceed?'
      );
      if (!confirmIncomplete) return;
    } else {
      // Confetti burst on full completion
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#00e5ff', '#ff5a1f'],
      });
    }

    const log: DailyLog = {
      log_date: logDate,
      status: allRulesDone ? 'completed' : 'failed',
      photo_url: photoPreview,
      caption: caption.trim() || null,
      rule_checks: rules.map((r) => ({
        rule_id: r.id,
        is_completed: completedRuleIds.includes(r.id),
      })),
    };

    onSaveLog(log);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Daily Check-In Matrix</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Logging for: <strong>{logDate}</strong> (3:00 AM reset cutoff active)
          </p>
        </div>

        <span
          className={`badge ${allRulesDone ? 'badge-success' : 'badge-fire'}`}
          style={{ fontSize: '0.75rem' }}
        >
          {completedRuleIds.length} / {rules.length} Complete
        </span>
      </div>

      {/* Rules Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {rules.map((rule) => {
          const isDone = completedRuleIds.includes(rule.id);
          return (
            <div
              key={rule.id}
              onClick={() => toggleRule(rule.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isDone ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)',
                border: isDone ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: isDone ? 'none' : '2px solid var(--border-medium)',
                  backgroundColor: isDone ? 'var(--accent-green)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                {isDone && <Check size={16} strokeWidth={3} />}
              </div>

              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: isDone ? '#fff' : 'var(--text-secondary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  opacity: isDone ? 0.9 : 1,
                }}
              >
                {rule.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Photo Upload with Client-Side WebP Compression */}
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Daily Proof Photo (Auto-compressed to WebP &lt; 200 KB)</label>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            className="btn btn-secondary btn-sm"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Upload size={16} />
            <span>{photoPreview ? 'Change Photo' : 'Upload Proof Photo'}</span>
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
              Compressing image on canvas...
            </span>
          )}

          {compressionStats && !isCompressing && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)' }}>
              ✓ {compressionStats}
            </span>
          )}
        </div>

        {photoPreview && (
          <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: '240px' }}>
            <img src={photoPreview} alt="Proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}
      </div>

      {/* Caption Field */}
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="log-caption">
          Daily Reflection or Workout Notes
        </label>
        <textarea
          id="log-caption"
          className="input-field"
          rows={2}
          placeholder="How was today's discipline? Share thoughts with the squad..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ padding: '0.9rem 1.5rem', width: '100%', fontWeight: 700 }}
      >
        <Sparkles size={18} />
        {allRulesDone ? 'Lock In Completed Day' : 'Save Check-In'}
      </button>
    </form>
  );
}
