import { describe, it, expect } from 'vitest';
import {
  HYPE_PHRASES,
  POOLS_FOR_LOCALE,
  getHypePhrase,
  phrasesForLocale,
  pickRandomHypePhrase,
  localizedHypePhrase,
} from '@/lib/hype-phrases';

describe('Hype phrase pools', () => {
  it('has independent pools per language, not translations', () => {
    // The whole point: German is written in German, not mapped 1:1 from
    // English, so the pools are different sizes by design.
    const en = HYPE_PHRASES.filter((p) => p.lang === 'en');
    const de = HYPE_PHRASES.filter((p) => p.lang === 'de');
    const gsw = HYPE_PHRASES.filter((p) => p.lang === 'gsw');

    expect(en.length).toBeGreaterThanOrEqual(300);
    expect(de.length).toBeGreaterThanOrEqual(200);
    expect(gsw.length).toBeGreaterThanOrEqual(100);
  });

  it('has unique, stable ids', () => {
    // Ids are stored in daily_logs.hype_phrase_id — a duplicate would make a
    // stored hype ambiguous.
    const ids = HYPE_PHRASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no empty phrases', () => {
    expect(HYPE_PHRASES.filter((p) => p.text.trim() === '')).toEqual([]);
  });

  it('uses Swiss orthography — ss, never ß', () => {
    const offenders = HYPE_PHRASES.filter((p) => p.text.includes('ß'));
    expect(offenders.map((p) => p.id)).toEqual([]);
  });

  it('leaves no placeholder unsubstituted when rendered with the standard vars', () => {
    // Regression: HypeButton once rendered without `days`, so "Day {days}?!"
    // shipped to the feed with the braces visible.
    for (const phrase of HYPE_PHRASES) {
      const rendered = localizedHypePhrase(phrase, { days: 34, name: 'Alex' });
      expect(rendered, `${phrase.id}`).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('phrasesForLocale', () => {
  it('gives an English speaker English only', () => {
    expect(phrasesForLocale('en').every((p) => p.lang === 'en')).toBe(true);
  });

  it('gives a German speaker both High German and Swiss German', () => {
    const langs = new Set(phrasesForLocale('de').map((p) => p.lang));
    expect(langs).toEqual(new Set(['de', 'gsw']));
    expect(POOLS_FOR_LOCALE.de).toEqual(['de', 'gsw']);
  });
});

describe('pickRandomHypePhrase', () => {
  it('draws only from the caller locale pool', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandomHypePhrase('en').lang).toBe('en');
      expect(['de', 'gsw']).toContain(pickRandomHypePhrase('de').lang);
    }
  });

  it('never returns the excluded phrase, so a re-roll always visibly changes', () => {
    const first = pickRandomHypePhrase('en');
    for (let i = 0; i < 100; i++) {
      expect(pickRandomHypePhrase('en', first.id).id).not.toBe(first.id);
    }
  });
});

describe('getHypePhrase', () => {
  it('resolves a stored id back to its phrase', () => {
    const any = HYPE_PHRASES[0];
    expect(getHypePhrase(any.id)?.text).toBe(any.text);
  });

  it('returns undefined for an id we no longer ship', () => {
    expect(getHypePhrase('does-not-exist')).toBeUndefined();
  });
});

describe('Historical ids', () => {
  // Regression: regenerating this file into language pools renumbered every id
  // and orphaned six that were already stored in daily_logs.hype_phrase_id,
  // blanking the quote on those posts. Ids are permanent — pin the ones known
  // to exist in a live database so they can never be dropped again.
  const STORED_IN_PRODUCTION = [
    'legacy-fire',
    'legacy-beast',
    'legacy-launch',
    'legacy-hype',
    'built-different',
    'level-up',
    'discipline-flex',
  ];

  it.each(STORED_IN_PRODUCTION)('still resolves %s', (id) => {
    expect(getHypePhrase(id)?.text).toBeTruthy();
  });
});
