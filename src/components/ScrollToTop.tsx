'use client';

/**
 * Back-to-top button, shown once the page has scrolled far enough to be worth
 * it.
 *
 * Deliberately a real `<button>` that is removed from the DOM (not just faded)
 * while inactive, so it never becomes an invisible tab stop. Scroll listening
 * is passive and rAF-throttled — this runs on every page, so it must not cost
 * anything during a scroll.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** Roughly two viewports — far enough that scrolling back is a real chore. */
const SHOW_AFTER_PX = 900;

export default function ScrollToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const evaluate = () => {
      frame.current = null;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };

    const onScroll = () => {
      // Coalesce bursts of scroll events into one read per frame.
      if (frame.current === null) frame.current = window.requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  const scrollUp = useCallback(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollUp}
      className="icon-btn scroll-top"
      aria-label={t('nav.scrollTop')}
      title={t('nav.scrollTop')}
    >
      <ArrowUp size={18} />
    </button>
  );
}
