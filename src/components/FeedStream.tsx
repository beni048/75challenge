'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import FeedCard from './FeedCard';
import { FeedPost } from '@/lib/feed';
import { ReactionType } from './HypeButton';
import { Flame, Users, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from './ChallengeProvider';
import { useToast } from './Toast';
import { fetchFeed, addReaction, unfollowUser, refollowUser } from '@/lib/db/feed';
import { getEffectiveLogDate } from '@/lib/date-utils';

/**
 * The community feed. Rendered both at /feed and as the landing page for
 * signed-in participants.
 */
export default function FeedStream() {
  const { t } = useI18n();
  const toast = useToast();
  const { session, challenge, loading: authLoading } = useChallenge();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [showingPreviews, setShowingPreviews] = useState(false);
  const [loading, setLoading] = useState(true);

  const viewerId = challenge?.id ?? null;

  // Bumping this re-runs the fetch below (used after an unfollow is undone).
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((n) => n + 1);

  // Canonical fetch-in-effect: the `active` flag drops a response that arrives
  // after the inputs changed, so a slow request can never overwrite fresher
  // data. Signed-out visitors never get here — the login gate renders instead.
  useEffect(() => {
    if (authLoading || !session) return;

    let active = true;

    (async () => {
      const result = await fetchFeed(viewerId, getEffectiveLogDate());
      if (!active) return;

      setLoading(false);

      if (result.error || !result.data) {
        toast.error(result.error ?? t('status.loadFailed'));
        return;
      }

      setPosts(result.data.posts);
      setTotalUsers(result.data.totalUsers);
      setActiveToday(result.data.activeToday);
      setShowingPreviews(result.data.showingPreviews);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, session, viewerId, reloadToken, toast, t]);

  /** Optimistic: the count moves immediately, the write follows. */
  const handleReact = async (postId: string, type: ReactionType) => {
    if (!viewerId) return;
    // Preview posts are not real rows, so there is nothing to react to.
    if (postId.startsWith('mock-post-')) return;

    const result = await addReaction(postId, viewerId, type);
    if (result.error) toast.error(result.error);
  };

  const handleUnfollow = async (userId: string, undo: boolean) => {
    if (!viewerId) return;
    const result = undo
      ? await refollowUser(viewerId, userId)
      : await unfollowUser(viewerId, userId);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (undo) reload();
  };

  if (authLoading) return <div style={{ minHeight: '60vh' }} />;

  // The feed is for participants only (start.md §5).
  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>{t('feed.loginRequired')}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-secondary">
              {t('nav.login')}
            </Link>
            <Link href="/join" className="btn btn-primary">
              {t('nav.join')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('feed.activeToday')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {totalUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('feed.totalUsers')}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={20} color="var(--accent-orange)" />
          {t('feed.liveTitle')}
        </h3>
      </div>

      {/* Says plainly that the sample posts are samples. They disappear as soon
          as a real participant checks in today. */}
      {showingPreviews && (
        <div className="notice notice-info" style={{ marginBottom: '1.25rem' }}>
          <Info size={18} />
          <span>{t('feed.previewNotice')}</span>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('common.loading')}</p>
      ) : posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('feed.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} onUnfollow={handleUnfollow} onReact={handleReact} />
          ))}
        </div>
      )}
    </div>
  );
}
