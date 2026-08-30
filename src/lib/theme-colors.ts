/**
 * Resolves the app's CSS custom properties to literal colour strings, for the
 * rare spot (canvas-confetti) that cannot read a `var(--token)` reference
 * directly and needs an actual value.
 *
 * Reading it at call time — rather than hardcoding hex — is what keeps it
 * correct in both themes automatically, since it reads whatever is currently
 * applied to `<html>` (start.md §13: every colour goes through a token).
 */
export function resolveCssColors(tokenNames: string[]): string[] {
  if (typeof window === 'undefined') return [];
  const styles = getComputedStyle(document.documentElement);
  return tokenNames
    .map((name) => styles.getPropertyValue(name).trim())
    .filter((value) => value.length > 0);
}
