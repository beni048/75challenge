'use client';

/**
 * Whether a sign-up is currently being committed.
 *
 * Deliberately module-scoped rather than component state. `OnboardingModal`
 * has no effects at all, so its `step` cannot change on its own — which means
 * the reported "modal flashes back to earlier steps with empty fields" can
 * only be a REMOUNT of the modal (or of the page holding it) somewhere between
 * the auth call landing and `router.push` completing. A remount resets every
 * `useState` in the subtree, so an `isSubmitting` flag held in the modal would
 * be wiped by the very thing it needs to mask.
 *
 * Living outside React means a remount re-reads `true` and paints the overlay
 * immediately, so there is no frame where step 1 is visible. Read through
 * `useSyncExternalStore`, matching `src/lib/theme.tsx` and
 * `src/lib/use-profile-view.ts`.
 *
 * Not persisted: the flag exists only for this page load, and navigating to
 * the profile discards it along with everything else.
 */

import { useSyncExternalStore } from 'react';

const CHANGE_EVENT = '75:signup-in-flight';

let inFlight = false;

function emit(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Marks a sign-up as under way. Never cleared on success: the modal must stay
 * masked until navigation unmounts it, and clearing it early is exactly the
 * gap that let the form reappear.
 */
export function beginSignup(): void {
  inFlight = true;
  emit();
}

/** Cleared only when the attempt failed and the form has to be usable again. */
export function endSignup(): void {
  inFlight = false;
  emit();
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

const getSnapshot = (): boolean => inFlight;
/** No sign-up can be in flight during a server render. */
const getServerSnapshot = (): boolean => false;

export function useSignupInFlight(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
