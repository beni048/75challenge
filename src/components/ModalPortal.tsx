'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Renders modal content into `document.body`.
 *
 * Modals are declared next to the component that owns them, which usually puts
 * them inside a `.container` — and `.container` sets `position: relative;
 * z-index: 1`, creating a stacking context that traps the overlay. A later
 * sibling with its own stacking context (the footer) would then paint over it.
 * Portalling to the body takes the overlay out of that trap entirely, so a
 * single global z-index is enough.
 *
 * While open it also locks body scroll and closes on Escape.
 */
export default function ModalPortal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!isOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!hydrated) return null;
  return createPortal(children, document.body);
}
