'use client';

/**
 * A small "(i)" button that opens an explanation on tap.
 *
 * Renders ONLY phrasing content (span/button, never div): it sits inside a
 * <p> in RuleCustomizer and inside a <label> in AccountClient, both of which
 * reject flow content. A <div> here is a hydration error, not just invalid
 * markup. The CSS gives the spans their display values. Deliberately
 * tap-triggered, not hover-only — hover doesn't exist on touch devices, and
 * this app is mobile-first (start.md §12).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

// Keep in step with .info-tooltip-popover's max-width in globals.css.
const POPOVER_MAX_WIDTH_PX = 280;
const VIEWPORT_MARGIN_PX = 16;

export default function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  // Which edge of the trigger the popover hangs from. Decided once, at the
  // moment it opens, from the trigger's actual position — a fixed `left: 0`
  // overflows the viewport whenever the trigger sits in the right portion of
  // a narrow screen (see start.md §12 rule 10: no popover may render partly
  // off-screen).
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const ref = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const handleTriggerClick = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const wouldOverflowRight = rect.left + POPOVER_MAX_WIDTH_PX > window.innerWidth - VIEWPORT_MARGIN_PX;
      setAlign(wouldOverflowRight ? 'right' : 'left');
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <span ref={ref} className="info-tooltip">
      <button
        type="button"
        className="icon-btn info-tooltip-trigger"
        onClick={handleTriggerClick}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <Info size={15} />
      </button>

      {open && (
        <span className={`info-tooltip-popover align-${align}`} role="tooltip">
          <span>{text}</span>
          <button type="button" onClick={close} aria-label={label} className="info-tooltip-close">
            <X size={14} />
          </button>
        </span>
      )}
    </span>
  );
}
