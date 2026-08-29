'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  ChallengeSession,
  SESSION_EVENT,
  SESSION_STORAGE_KEY,
  parseSession,
  saveSession as persist,
} from '@/lib/session';
import { useHydrated } from '@/lib/use-hydrated';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// The snapshot is the raw stored string, which is referentially stable between
// writes. Parsing happens in a memo so a re-render never produces a new object.
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

const getServerSnapshot = (): string | null => null;

/**
 * Subscribes a component to the local challenge session.
 *
 * `ready` stays false until hydration completes, so callers can hold off
 * rendering session-dependent UI instead of flashing the logged-out view.
 * Writes from other tabs (`storage`) and other components (`75:session`) both
 * refresh the value.
 */
export function useSession() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useHydrated();

  const session = useMemo(() => parseSession(raw), [raw]);

  const saveSession = useCallback((next: ChallengeSession) => persist(next), []);

  return { session, ready, saveSession };
}
