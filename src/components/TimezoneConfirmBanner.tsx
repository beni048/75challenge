'use client';

/**
 * One-time nudge for accounts still on the migration's 'UTC' default.
 *
 * Existing accounts (created before per-user timezones existed) were all
 * backfilled to 'UTC', which is silently wrong for almost everyone. Rather
 * than auto-correcting — a wrong auto-guess could be just as wrong as UTC,
 * and silently shifting someone's day boundary without their explicit action
 * undermines the "you are the judge of your own progress" model — this shows
 * a dismissible prompt offering to update it, and never touches the stored
 * value itself.
 */

import React, { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Info, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from './ChallengeProvider';
import { useHydrated } from '@/lib/use-hydrated';

const DISMISSED_KEY_PREFIX = '75_timezone_prompt_dismissed_';
const DISMISS_EVENT = '75:timezone-prompt-dismissed';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Reads dismissal state for one challenge id, off the render path. */
function useDismissed(challengeId: string | undefined): boolean {
  const getSnapshot = useCallback(() => {
    if (!challengeId) return false;
    try {
      return window.localStorage.getItem(DISMISSED_KEY_PREFIX + challengeId) === '1';
    } catch {
      return false;
    }
  }, [challengeId]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default function TimezoneConfirmBanner() {
  const { t } = useI18n();
  const { challenge } = useChallenge();
  const hydrated = useHydrated();
  const dismissed = useDismissed(challenge?.id);

  const detected = hydrated && challenge ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const shouldOffer = Boolean(challenge && detected && challenge.timezone === 'UTC' && detected !== 'UTC');

  if (!challenge || !shouldOffer || dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY_PREFIX + challenge.id, '1');
    } catch {
      // Storage blocked — the banner just reappears next visit, harmless.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <div className="container" style={{ paddingTop: '1rem' }}>
      <div className="notice notice-info" style={{ alignItems: 'center' }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{t('timezone.confirmPrompt', { timezone: detected ?? '' })}</span>
        <Link href="/account?tab=profile" className="btn btn-sm btn-secondary" onClick={dismiss}>
          {t('timezone.confirmUpdate')}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('shield.close')}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
