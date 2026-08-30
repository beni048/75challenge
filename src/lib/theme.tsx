'use client';

/**
 * Dark / light theme handling.
 *
 * localStorage is the source of truth and is read through `useSyncExternalStore`,
 * so React stays in step with it without a mount effect. The resolved theme is
 * written to `document.documentElement.dataset.theme`, which globals.css keys its
 * token overrides off. With no stored choice we follow the OS
 * `prefers-color-scheme` setting and keep following it as it changes.
 */

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = '75_theme';
const THEME_EVENT = '75:theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

function lightMedia(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  return window.matchMedia('(prefers-color-scheme: light)');
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage unavailable — fall through to the system preference.
  }
  return lightMedia()?.matches ? 'light' : 'dark';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange);
  const media = lightMedia();
  media?.addEventListener('change', onChange);

  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
    media?.removeEventListener('change', onChange);
  };
}

// Snapshots must be referentially stable; these are plain strings, so they are.
const getServerSnapshot = (): Theme => 'dark';

function writeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures — the dispatch below still applies the choice.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readStoredTheme, getServerSnapshot);

  // Mirror the resolved theme onto the document — an external system, which is
  // exactly what an effect is for.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback((next: Theme) => writeTheme(next), []);
  const toggleTheme = useCallback(() => writeTheme(readStoredTheme() === 'dark' ? 'light' : 'dark'), []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: 'dark', setTheme: () => {}, toggleTheme: () => {} };
  }
  return ctx;
}

/**
 * Runs before first paint to apply the stored theme and locale, so the page
 * never flashes the wrong colours or language. Injected via
 * `dangerouslySetInnerHTML` in the root layout.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
var l=localStorage.getItem('75_locale');
if(l!=='en'&&l!=='de'){l=(navigator.language||'en').toLowerCase().indexOf('de')===0?'de':'en';}
document.documentElement.lang=l;
}catch(e){document.documentElement.dataset.theme='dark';}})();`;
