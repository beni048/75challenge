'use client';

/**
 * Offers commitment tiers to accounts that predate them.
 *
 * Migration 0006 backfilled every existing account to `'classic'`, which is
 * exactly the behaviour they already had — so nothing changed under anyone.
 * But a silently-defaulted user never actually *chose*, which is why
 * supabase.md §5 requires an explicit offer as well as a safe backfill.
 *
 * Unlike TimezoneConfirmBanner (which predates the mechanism and uses
 * localStorage), dismissal is recorded in `users.acknowledged_updates`, so
 * this does not reappear on the participant's other devices.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from './ChallengeProvider';
import { acknowledgeUpdate } from '@/lib/db/profile';
import { COMMITMENT_ANNOUNCEMENT_KEY } from '@/lib/shield-policy';

export default function CommitmentAnnouncement() {
  const { t } = useI18n();
  const { challenge, refresh } = useChallenge();
  const [dismissing, setDismissing] = useState(false);

  const alreadySeen = challenge?.acknowledgedUpdates?.includes(COMMITMENT_ANNOUNCEMENT_KEY) ?? true;
  if (!challenge || alreadySeen || dismissing) return null;

  const dismiss = async () => {
    setDismissing(true);
    await acknowledgeUpdate(challenge.id, COMMITMENT_ANNOUNCEMENT_KEY);
    await refresh();
  };

  return (
    <div className="container announcement-wrap">
      <div className="notice notice-info announcement">
        <Sparkles size={18} className="announcement-icon" />
        <span className="announcement-body">{t('commitment.announce')}</span>
        <Link
          href="/account?tab=profile"
          className="btn btn-sm btn-secondary"
          onClick={dismiss}
        >
          {t('commitment.announceCta')}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('shield.close')}
          className="announcement-dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
