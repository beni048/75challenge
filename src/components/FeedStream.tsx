'use client';

import React, { useMemo, useState } from 'react';
import FeedCard from './FeedCard';
import { FeedPost, STATIC_MOCK_FEED_POSTS } from '@/lib/feed';
import { ReactionType } from './HypeButton';
import { Flame, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSession } from './useSession';
import { getEffectiveLogDate } from '@/lib/date-utils';

/**
 * The community feed. Rendered both at /feed and as the landing page for
 * signed-in users.
 */
export default function FeedStream() {
  const { t } = useI18n();
  const { session } = useSession();
  const [posts] = useState<FeedPost[]>(STATIC_MOCK_FEED_POSTS);
  const [unfollowedUserIds, setUnfollowedUserIds] = useState<string[]>([]);

  const handleUnfollow = (userId: string) => {
    setUnfollowedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
  };

  const handleReact = (postId: string, type: ReactionType) => {
    // Optimistic in the card; a live deployment syncs this to Supabase.
    console.log(`Reacted ${type} to post ${postId}`);
  };

  const visiblePosts = posts
    .filter((post) => !unfollowedUserIds.includes(post.user_id))
    // Positive-only requirement: only completed or shielded days ever render.
    .filter((post) => post.status === 'completed' || post.status === 'shielded');

  // Counts are derived from the posts actually in the feed plus the viewer, so
  // the numbers never claim more activity than is on screen.
  const { totalUsers, activeToday } = useMemo(() => {
    const today = getEffectiveLogDate();
    const everyone = new Set(posts.map((p) => p.user_id));
    const activeUserIds = new Set(
      posts.filter((p) => p.created_at.slice(0, 10) === today).map((p) => p.user_id)
    );

    if (session) {
      everyone.add(session.id);
      if (session.logs.some((log) => log.log_date === today)) activeUserIds.add(session.id);
    }

    return { totalUsers: everyone.size, activeToday: activeUserIds.size };
  }, [posts, session]);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '780px' }}>
      {/* Community counters */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid var(--border-accent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-orange-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} color="var(--accent-orange)" />
          </div>
          <h4 style={{ fontSize: '1rem' }}>{t('feed.statsTitle')}</h4>
        </div>

        <div style={{ display: 'flex', gap: '1.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              {activeToday}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {t('feed.activeToday')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {totalUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {t('feed.totalUsers')}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={20} color="var(--accent-orange)" />
          {t('feed.liveTitle')}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {visiblePosts.map((post) => (
          <FeedCard key={post.id} post={post} onUnfollow={handleUnfollow} onReact={handleReact} />
        ))}
      </div>
    </div>
  );
}
