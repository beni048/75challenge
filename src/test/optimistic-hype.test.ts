import { describe, it, expect } from 'vitest';
import { applyOptimisticHype, type FeedPost } from '@/lib/feed';

const VIEWER = { username: 'beni', displayName: 'Beni' };

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 'p1',
    user_id: 'u1',
    user: { username: 'pascal', display_name: 'Pascal' },
    day_number: 12,
    log_date: '2026-09-12',
    status: 'completed',
    completed_rules: [],
    total_rules: 0,
    created_at: '2026-09-12T10:00:00Z',
    hypeCount: 0,
    ...overrides,
  };
}

describe('applyOptimisticHype', () => {
  it('claims the phrase when nobody has hyped yet', () => {
    const next = applyOptimisticHype(post(), 'en-001', VIEWER);
    expect(next.hypePhraseId).toBe('en-001');
    expect(next.hypeClaimedBy).toEqual(VIEWER);
    expect(next.hypeCount).toBe(1);
    expect(next.viewerHasHyped).toBe(true);
  });

  it('does not list the claimer as also agreeing with themselves', () => {
    const next = applyOptimisticHype(post(), 'en-001', VIEWER);
    expect(next.agreedBy).toEqual([]);
  });

  it('agrees without changing the claimed sentence', () => {
    const claimed = post({
      hypeCount: 1,
      hypePhraseId: 'en-001',
      hypeClaimedBy: { username: 'pascal', displayName: 'Pascal' },
      agreedBy: [],
    });
    const next = applyOptimisticHype(claimed, 'en-001', VIEWER);

    expect(next.hypePhraseId).toBe('en-001');
    expect(next.hypeClaimedBy?.displayName).toBe('Pascal');
    // The count AND the agree line move together — updating only the count is
    // what left "N others agree" stale until a reload.
    expect(next.hypeCount).toBe(2);
    expect(next.agreedBy).toEqual([VIEWER]);
  });

  it('puts the newest agreer first', () => {
    const claimed = post({
      hypeCount: 2,
      hypePhraseId: 'en-001',
      hypeClaimedBy: { username: 'pascal', displayName: 'Pascal' },
      agreedBy: [{ username: 'sam', displayName: 'Sam' }],
    });
    expect(applyOptimisticHype(claimed, 'en-001', VIEWER).agreedBy?.[0]).toEqual(VIEWER);
  });

  it('is idempotent, so a double tap cannot inflate the count', () => {
    const once = applyOptimisticHype(post(), 'en-001', VIEWER);
    const twice = applyOptimisticHype(once, 'en-002', VIEWER);
    expect(twice).toBe(once);
    expect(twice.hypeCount).toBe(1);
  });
});
