'use client';

/**
 * Hype: the first person to react *claims* a sentence for the post, everyone
 * after agrees with it.
 *
 * Two deliberately different interactions, because the two situations are
 * different:
 *
 *  - **Nobody has hyped yet** — a slot machine opens. A random phrase appears,
 *    you re-roll until one fits, and nothing is sent until you confirm. You
 *    always see the sentence *before* it goes out.
 *  - **Somebody already claimed it** — one tap to agree. No decision to make;
 *    the twelfth person wants to show support, not compose.
 *
 * Still no free text and no negative reaction (start.md §7): every sentence
 * comes from the curated pool in src/lib/hype-phrases.ts.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Rocket, Dices } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { pickRandomHypePhrase, localizedHypePhrase, type HypePhrase } from '@/lib/hype-phrases';
import { resolveCssColors } from '@/lib/theme-colors';
import ModalPortal from './ModalPortal';

interface HypeButtonProps {
  /** Everyone who has hyped: the claimer plus everyone agreeing. */
  hypeCount: number;
  /** The day this post is about — some phrases interpolate it ("Tag {days}?!"). */
  dayNumber: number;
  /** The sentence already claimed for this post, if any. */
  claimedPhraseId?: string | null;
  /** Whether this viewer has already hyped, so the button reads as done. */
  hasHyped?: boolean;
  /** Fires with the phrase to claim, or the claimed one when agreeing. */
  onHype?: (phraseId: string) => void;
}

export default function HypeButton({
  hypeCount,
  dayNumber,
  claimedPhraseId = null,
  hasHyped = false,
  onHype,
}: HypeButtonProps) {
  const { t, locale } = useI18n();

  // Adjusted during render rather than in an effect (React's own recommended
  // pattern for "reset local state when a prop changes"). This is what lets the
  // button re-sync when the feed refetches, instead of showing a stale
  // optimistic count forever.
  const [prevCount, setPrevCount] = useState(hypeCount);
  const [count, setCount] = useState(hypeCount);
  if (hypeCount !== prevCount) {
    setPrevCount(hypeCount);
    setCount(hypeCount);
  }

  const [prevHasHyped, setPrevHasHyped] = useState(hasHyped);
  const [hyped, setHyped] = useState(hasHyped);
  if (hasHyped !== prevHasHyped) {
    setPrevHasHyped(hasHyped);
    setHyped(hasHyped);
  }

  // Non-null only while the slot machine is open — i.e. before anything is sent.
  const [rolling, setRolling] = useState<HypePhrase | null>(null);

  const isClaimed = claimedPhraseId !== null;

  const commit = (phraseId: string, el: HTMLElement) => {
    if (!hyped) setCount((prev) => prev + 1);
    setHyped(true);
    setRolling(null);

    const rect = el.getBoundingClientRect();
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

    onHype?.(phraseId);
  };

  const handlePrimary = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (hyped) return;

    if (isClaimed) {
      // Agreeing: nothing to choose, so it lands immediately.
      commit(claimedPhraseId, e.currentTarget);
      return;
    }
    // Claiming: open the slot machine rather than sending straight away.
    setRolling(pickRandomHypePhrase(locale));
  };

  return (
    <div className="hype-wrap">
      <motion.button
        type="button"
        whileTap={{ scale: 1.12 }}
        onClick={handlePrimary}
        disabled={hyped}
        className={`btn btn-secondary btn-sm hype-button${hyped ? ' is-active' : ''}`}
        aria-pressed={hyped}
        title={hyped ? t('hype.alreadyHyped') : isClaimed ? t('hype.agree') : t('hype.beFirst')}
      >
        <Rocket size={15} />
        <span className="hype-button-count">{count}</span>
      </motion.button>

      {/* The slot machine. Only ever seen by the person claiming the post.
          A ModalPortal sheet rather than an in-place popover: `.container`
          creates a stacking context that traps an absolutely-positioned
          overlay, and anchoring to this small button gave it the button's
          width (start.md §13, rule 14). */}
      <ModalPortal isOpen={rolling !== null} onClose={() => setRolling(null)}>
        <AnimatePresence>
          {rolling && (
            <div className="modal-backdrop" onClick={() => setRolling(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.18 }}
                className="modal-content hype-roller"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={t('hype.beFirst')}
              >
                <p className="hype-roller-eyebrow">{t('hype.beFirst')}</p>

                <p className="hype-roller-phrase">
                  “{localizedHypePhrase(rolling, { days: dayNumber })}”
                </p>

                <div className="hype-roller-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRolling(pickRandomHypePhrase(locale, rolling.id))}
                  >
                    <Dices size={16} /> {t('hype.reroll')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => commit(rolling.id, e.currentTarget)}
                  >
                    {t('hype.send')}
                  </button>
                </div>

                <button
                  type="button"
                  className="hype-roller-cancel"
                  onClick={() => setRolling(null)}
                >
                  {t('common.cancel')}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

    </div>
  );
}
