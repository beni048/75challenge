import { describe, it, expect } from 'vitest';
import {
  HYPE_PHRASES,
  getHypePhrase,
  pickRandomHypePhrase,
  localizedHypePhrase,
} from '@/lib/hype-phrases';

// Mirrors the discipline i18n.test.ts applies to the main dictionary: every
// entry must exist in both locales with matching placeholders, since these
// ship independently of src/lib/i18n.tsx (see the file header for why).

function placeholders(text: string): string[] {
  return (text.match(/\{(\w+)\}/g) ?? []).sort();
}

describe('Hype phrase library', () => {
  it('ships at least the requested initial variety', () => {
    expect(HYPE_PHRASES.length).toBeGreaterThanOrEqual(50);
  });

  it('has a unique id for every phrase — ids are stored in the database and must never collide', () => {
    const ids = HYPE_PHRASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has non-empty English and German text for every phrase', () => {
    for (const phrase of HYPE_PHRASES) {
      expect(phrase.en.trim().length).toBeGreaterThan(0);
      expect(phrase.de.trim().length).toBeGreaterThan(0);
    }
  });

  it('has matching placeholders between English and German for every phrase', () => {
    for (const phrase of HYPE_PHRASES) {
      expect(placeholders(phrase.de)).toEqual(placeholders(phrase.en));
    }
  });

  it('preserves the four legacy ids the migration maps old reactions onto', () => {
    for (const id of ['legacy-fire', 'legacy-beast', 'legacy-launch', 'legacy-hype']) {
      expect(getHypePhrase(id)).toBeDefined();
    }
  });

  it('getHypePhrase returns undefined for an unknown id rather than throwing', () => {
    expect(getHypePhrase('does-not-exist')).toBeUndefined();
  });

  it('pickRandomHypePhrase always returns a real phrase', () => {
    for (let i = 0; i < 20; i++) {
      const phrase = pickRandomHypePhrase();
      expect(HYPE_PHRASES).toContainEqual(phrase);
    }
  });

  it('pickRandomHypePhrase excludes the given id when more than one phrase exists', () => {
    for (let i = 0; i < 20; i++) {
      const phrase = pickRandomHypePhrase('you-are-a-god');
      expect(phrase.id).not.toBe('you-are-a-god');
    }
  });

  it('falls back to the full list if the excluded id is the only option', () => {
    // Never actually happens with 50+ phrases, but the fallback must not throw.
    expect(() => pickRandomHypePhrase('you-are-a-god')).not.toThrow();
  });

  it('localizedHypePhrase interpolates placeholders per locale', () => {
    const phrase = getHypePhrase('days-impressive')!;
    expect(localizedHypePhrase(phrase, 'en', { days: 40 })).toBe('40 days in? Genuinely impressive.');
    expect(localizedHypePhrase(phrase, 'de', { days: 40 })).toBe('40 Tage durch? Ehrlich stark.');
  });

  it('leaves no placeholder unsubstituted when rendered with the standard vars', () => {
    // Regression: HypeButton rendered phrases without passing `days`, so
    // "Day {days}?! Screenshot this" shipped to the feed with the braces
    // visible. Every placeholder a phrase uses must be in this set.
    for (const locale of ['en', 'de'] as const) {
      for (const phrase of HYPE_PHRASES) {
        const rendered = localizedHypePhrase(phrase, locale, { days: 34, name: 'Alex' });
        expect(rendered, `${phrase.id} (${locale})`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('uses Swiss orthography — ss, never ß', () => {
    // The whole app is consistent on this; a stray ß from a copy-paste would
    // be the only one in the codebase.
    const offenders = HYPE_PHRASES.filter((p) => p.de.includes('\u00df'));
    expect(offenders.map((p) => p.id)).toEqual([]);
  });
});
