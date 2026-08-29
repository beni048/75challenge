import { describe, it, expect } from 'vitest';
import { normalizeSupabaseUrl } from '@/lib/supabase/config';

describe('normalizeSupabaseUrl', () => {
  it('leaves a correct project URL untouched', () => {
    expect(normalizeSupabaseUrl('https://abc123.supabase.co')).toBe('https://abc123.supabase.co');
  });

  it('strips the /rest/v1/ endpoint people paste from the dashboard', () => {
    // Left in place, this makes every auth call resolve to /rest/v1/auth/v1/...
    // which Supabase rejects with "Invalid path specified in request URL".
    expect(normalizeSupabaseUrl('https://abc123.supabase.co/rest/v1/')).toBe(
      'https://abc123.supabase.co'
    );
  });

  it('strips a trailing slash', () => {
    expect(normalizeSupabaseUrl('https://abc123.supabase.co/')).toBe('https://abc123.supabase.co');
  });

  it('strips any other stray path', () => {
    expect(normalizeSupabaseUrl('https://abc123.supabase.co/auth/v1')).toBe(
      'https://abc123.supabase.co'
    );
  });

  it('returns unparseable input unchanged for the caller to report', () => {
    expect(normalizeSupabaseUrl('not-a-url')).toBe('not-a-url');
  });
});
