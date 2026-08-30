'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { pickRandomHypePhrase, getHypePhrase, localizedHypePhrase } from '@/lib/hype-phrases';
import { resolveCssColors } from '@/lib/theme-colors';

interface HypeButtonProps {
  /** Distinct people who have hyped this post so far. */
  hypeCount: number;
  /**
   * The day this post is about. Some phrases interpolate it ("Day {days}?!"),
   * and it comes from the POST rather than the viewer so every viewer sees the
   * same sentence the sender did.
   */
  dayNumber: number;
  /** This viewer's own phrase id, if they've already hyped this post. */
  myPhraseId?: string | null;
  onReact?: (phraseId: string) => void;
}

/**
 * One button, not four: hype is a single tap that picks a random witty
 * phrase rather than a choice of four fixed emoji (start.md §7 — still no
 * user-authored text, still no negative reaction, just curated variety).
 * Tapping again re-rolls to a different phrase instead of adding a tally,
 * since a hype is a statement, not a like count.
 */
export default function HypeButton({ hypeCount: initialCount, myPhraseId: initialPhraseId, onReact }: HypeButtonProps) {
  const { t, locale } = useI18n();

  // Adjusted during render, not in an effect (React's own recommended pattern
  // for "reset local state when a prop changes" — an effect here would cause
  // an extra render pass and trips the set-state-in-effect lint rule). This is
  // what makes the button re-sync if the server-fetched props change under it
  // — e.g. a feed reload — which the old implementation never did and could
  // show a stale optimistic count forever.
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);
  const [count, setCount] = useState(initialCount);
  if (initialCount !== prevInitialCount) {
    setPrevInitialCount(initialCount);
    setCount(initialCount);
  }

  const normalizedInitialPhraseId = initialPhraseId ?? null;
  const [prevInitialPhraseId, setPrevInitialPhraseId] = useState(normalizedInitialPhraseId);
  const [myPhraseId, setMyPhraseId] = useState<string | null>(normalizedInitialPhraseId);
  if (normalizedInitialPhraseId !== prevInitialPhraseId) {
    setPrevInitialPhraseId(normalizedInitialPhraseId);
    setMyPhraseId(normalizedInitialPhraseId);
  }

  const [popupText, setPopupText] = useState<string | null>(null);

  useEffect(() => {
    if (!popupText) return;
    const timer = setTimeout(() => setPopupText(null), 2200);
    return () => clearTimeout(timer);
  }, [popupText]);

  const handleTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const alreadyHyped = myPhraseId !== null;
    const phrase = pickRandomHypePhrase(myPhraseId);

    if (!alreadyHyped) setCount((prev) => prev + 1);
    setMyPhraseId(phrase.id);
    setPopupText(localizedHypePhrase(phrase, locale, { days: dayNumber }));

    const rect = e.currentTarget.getBoundingClientRect();
    confetti({
      particleCount: 20,
      spread: 50,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: resolveCssColors(['--accent-orange', '--accent-cyan', '--accent-green', '--accent-purple']),
      ticks: 70,
      disableForReducedMotion: true,
    });

    onReact?.(phrase.id);
  };

  const myPhraseText = myPhraseId
    ? localizedHypePhrase(getHypePhrase(myPhraseId) ?? { id: myPhraseId, en: '', de: '' }, locale, {
        days: dayNumber,
      })
    : null;

  return (
    <div className="hype-button-wrap">
      <motion.button
        type="button"
        whileTap={{ scale: 1.15 }}
        onClick={handleTap}
        className={`btn btn-secondary btn-sm hype-button${myPhraseId ? ' is-active' : ''}`}
        title={myPhraseText ? t('hype.reroll') : t('hype.give')}
        aria-pressed={myPhraseId !== null}
      >
        <Sparkles size={16} />
        <span className="hype-button-count">{count}</span>
      </motion.button>

      {myPhraseText && !popupText && <span className="hype-my-phrase">“{myPhraseText}”</span>}

      <AnimatePresence>
        {popupText && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="hype-popup"
          >
            “{popupText}”
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
