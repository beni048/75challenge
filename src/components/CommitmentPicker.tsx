'use client';

/**
 * The three commitment tiers, as selectable cards.
 *
 * Shared by the onboarding step and the Account → Profile settings, so the
 * wording and ordering can never drift between where you choose a tier and
 * where you change it.
 *
 * Tone note (start.md §14): each tier states its mechanic plainly and none of
 * them is framed as the "right" one. The easier tiers are not apologised for
 * and the hardest is not glorified — the participant is accountable only to
 * themselves.
 */

import React from 'react';
import { Lock, Shield, RefreshCw } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { COMMITMENT_LEVELS, SHIELD_RECHARGE_DAYS, type CommitmentLevel } from '@/lib/shield-policy';

const TIER_ICON: Record<CommitmentLevel, React.ReactNode> = {
  purist: <Lock size={18} color="var(--accent-orange)" />,
  classic: <Shield size={18} color="var(--accent-cyan)" />,
  flex: <RefreshCw size={18} color="var(--accent-green)" />,
};

interface CommitmentPickerProps {
  value: CommitmentLevel;
  onChange: (level: CommitmentLevel) => void;
  /** Locks the control once an attempt is under way. */
  disabled?: boolean;
}

export default function CommitmentPicker({ value, onChange, disabled = false }: CommitmentPickerProps) {
  const { t } = useI18n();

  return (
    <div className="stack stack-tight" role="radiogroup" aria-label={t('commitment.legend')}>
      {COMMITMENT_LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`glass-card commitment-card${selected ? ' is-selected' : ''}`}
          >
            <span className="commitment-card-head">
              {TIER_ICON[level]}
              <strong className="commitment-card-name">
                {t(`commitment.${level}.name` as TranslationKey)}
              </strong>
              <span className="commitment-card-rule">
                {t(`commitment.${level}.rule` as TranslationKey)}
              </span>
            </span>
            <span className="commitment-card-body">
              {t(`commitment.${level}.desc` as TranslationKey, { days: SHIELD_RECHARGE_DAYS })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
