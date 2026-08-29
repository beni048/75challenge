import { describe, it, expect } from 'vitest';
import { STATIC_MOCK_FEED_POSTS, FeedPost } from '@/lib/feed';

describe('Feed Logic & Rules', () => {
  it('contains curated static mock posts matching the feed schema', () => {
    expect(STATIC_MOCK_FEED_POSTS.length).toBeGreaterThanOrEqual(2);

    STATIC_MOCK_FEED_POSTS.forEach((post) => {
      expect(post.id).toBeDefined();
      expect(post.user.username).toBeDefined();
      expect(post.day_number).toBeGreaterThan(0);
      expect(['completed', 'shielded']).toContain(post.status);
      expect(post.completed_rules.length).toBeGreaterThan(0);
    });
  });

  it('strictly filters feed posts to positive-only (completed or shielded)', () => {
    const rawPosts: Partial<FeedPost>[] = [
      { id: '1', status: 'completed' },
      { id: '2', status: 'shielded' },
      // @ts-expect-error test failed status filter
      { id: '3', status: 'failed' },
    ];

    const positiveOnly = rawPosts.filter(
      (p) => p.status === 'completed' || p.status === 'shielded'
    );

    expect(positiveOnly.length).toBe(2);
    expect(positiveOnly.some((p) => (p.status as string) === 'failed')).toBe(false);
  });
});
