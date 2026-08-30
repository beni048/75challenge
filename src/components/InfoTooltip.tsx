'use client';

/**
 * A small "(i)" button that opens an explanation on tap. Deliberately
 * tap-triggered, not hover-only — hover doesn't exist on touch devices, and
 * this app is mobile-first (start.md §12).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

export default function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

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
    <div ref={ref} className="info-tooltip">
      <button
        type="button"
        className="icon-btn info-tooltip-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <Info size={15} />
      </button>

      {open && (
        <div className="info-tooltip-popover" role="tooltip">
          <span>{text}</span>
          <button type="button" onClick={close} aria-label={label} className="info-tooltip-close">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
