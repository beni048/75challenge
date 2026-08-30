'use client';

/**
 * Which dashboard view the owner last chose: the focused ring + 3-day picker,
 * or the full 75-day grid.
 *
 * A per-device display preference, so localStorage is the right home for it
 * (start.md §2 — localStorage holds preferences, never challenge data). Read
 * through `useSyncExternalStore` rather than an effect, matching
 * `src/lib/theme.tsx`, so React stays in step without a mount-time setState.
 */

import { useCallback, useSyncExternalStore } from 'react';

export type ProfileView = 'focus' | 'grid';

export const PROFILE_VIEW_STORAGE_KEY = '75_profile_view';
const PROFILE_VIEW_EVENT = '75:profile-view';

function isProfileView(value: unknown): value is ProfileView {
  return value === 'focus' || value === 'grid';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(PROFILE_VIEW_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(PROFILE_VIEW_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readStored(): ProfileView {
  try {
    const stored = window.localStorage.getItem(PROFILE_VIEW_STORAGE_KEY);
    if (isProfileView(stored)) return stored;
  } catch {
    // Storage blocked (private mode) — fall through to the default.
  }
  return 'focus';
}

/** Server render has no localStorage; the focused view is the new default. */
const getServerSnapshot = (): ProfileView => 'focus';

export function useProfileView(): [ProfileView, (next: ProfileView) => void] {
  const view = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  const setView = useCallback((next: ProfileView) => {
    try {
      window.localStorage.setItem(PROFILE_VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore — the dispatch below still applies it for this session.
    }
    window.dispatchEvent(new Event(PROFILE_VIEW_EVENT));
  }, []);

  return [view, setView];
}
