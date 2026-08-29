import { describe, it, expect } from 'vitest';
import { toUsernameSlug } from '@/lib/db/profile';
import { shouldShowPreviews } from '@/lib/db/feed';

describe('toUsernameSlug', () => {
  it('lowercases and joins words with underscores', () => {
    expect(toUsernameSlug('Sarah Connor')).toBe('sarah_connor');
  });

  it('strips accents rather than replacing them', () => {
    expect(toUsernameSlug('Jörg Müller')).toBe('jorg_muller');
  });

  it('collapses runs of punctuation into a single underscore', () => {
    expect(toUsernameSlug('A...B   C')).toBe('a_b_c');
  });

  it('trims leading and trailing underscores', () => {
    expect(toUsernameSlug('  !hello!  ')).toBe('hello');
  });

  it('falls back to a usable name when nothing survives', () => {
    // e.g. a display name written entirely in an unsupported script
    expect(toUsernameSlug('!!!')).toBe('challenger');
  });
});

describe('shouldShowPreviews', () => {
  it('shows curated previews while nobody has checked in today', () => {
    expect(shouldShowPreviews(0)).toBe(true);
  });

  it('drops them as soon as one real participant has posted today', () => {
    expect(shouldShowPreviews(1)).toBe(false);
    expect(shouldShowPreviews(12)).toBe(false);
  });
});
