import { describe, it, expect } from 'vitest';
import { translations, translate, interpolate, LOCALES, TranslationKey } from '@/lib/i18n';

describe('i18n', () => {
  it('ships exactly the English and German locales', () => {
    expect(LOCALES).toEqual(['en', 'de']);
  });

  it('translates every English key into German — no missing copy', () => {
    const englishKeys = Object.keys(translations.en) as TranslationKey[];
    const missing = englishKeys.filter((key) => !translations.de[key]);
    expect(missing).toEqual([]);
  });

  it('has no extra German keys that English does not define', () => {
    const englishKeys = new Set(Object.keys(translations.en));
    const extra = Object.keys(translations.de).filter((key) => !englishKeys.has(key));
    expect(extra).toEqual([]);
  });

  it('keeps the same placeholders in both languages', () => {
    const placeholders = (value: string) => (value.match(/\{(\w+)\}/g) ?? []).sort();

    for (const key of Object.keys(translations.en) as TranslationKey[]) {
      expect(placeholders(translations.de[key]), `placeholders differ for "${key}"`).toEqual(
        placeholders(translations.en[key])
      );
    }
  });

  it('never leaves a German string identical to English for real prose', () => {
    // Short shared tokens (language codes, "Sample"-style words) may coincide;
    // anything longer being identical means a forgotten translation.
    const suspicious = (Object.keys(translations.en) as TranslationKey[]).filter(
      (key) =>
        translations.en[key].length > 40 &&
        translations.en[key] === translations.de[key] &&
        !key.startsWith('nav.language')
    );
    expect(suspicious).toEqual([]);
  });

  describe('interpolate', () => {
    it('substitutes named placeholders', () => {
      expect(interpolate('Day {day} of {total}', { day: 3, total: 75 })).toBe('Day 3 of 75');
    });

    it('leaves unknown placeholders untouched', () => {
      expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
    });
  });

  describe('translate', () => {
    it('returns locale-specific copy', () => {
      expect(translate('en', 'nav.login')).toBe('Log In');
      expect(translate('de', 'nav.login')).toBe('Anmelden');
    });

    it('falls back to English for an unknown locale', () => {
      // @ts-expect-error deliberately passing an unsupported locale
      expect(translate('fr', 'nav.login')).toBe('Log In');
    });
  });
});
