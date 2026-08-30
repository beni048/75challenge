'use client';

import React from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface FollowToggleProps {
  /** True when the viewer has hidden this person from their feed. */
  hidden: boolean;
  onToggle: () => void;
  busy?: boolean;
  /**
   * Icon-only. Use in a dense row (the challenger directory) where a label
   * would crowd the name beside it — the accessible name still carries the
   * full meaning via aria-label and title (start.md §12).
   */
  compact?: boolean;
}

/**
 * Presentation-only — everyone on the platform is followed by default
 * (start.md §5), so this toggles the one thing that actually varies: whether
 * the viewer has hidden this person. Callers own the data fetch, so the same
 * component works both for a single profile (one lookup) and a directory
 * page (one bulk lookup for the whole list, no per-card query).
 */
export default function FollowToggle({
  hidden,
  onToggle,
  busy = false,
  compact = false,
}: FollowToggleProps) {
  const { t } = useI18n();
  const label = hidden ? t('network.follow') : t('network.following');

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-label={label}
      title={label}
      aria-pressed={!hidden}
      className={
        compact
          ? `icon-btn follow-toggle${hidden ? '' : ' is-following'}`
          : `btn btn-sm ${hidden ? 'btn-secondary' : 'btn-primary'}`
      }
    >
      {hidden ? <UserPlus size={16} /> : <UserCheck size={16} />}
      {!compact && label}
    </button>
  );
}
