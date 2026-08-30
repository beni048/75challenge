'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import FeedCard from './FeedCard';
import { FeedPost } from '@/lib/feed';
import { Flame, Users, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from './ChallengeProvider';
import { useToast } from './Toast';
import { fetchFeed, addReaction } from '@/lib/db/feed';
import { hideFromFeed, unhideFromFeed } from '@/lib/db/network';
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
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

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
      // The feed spans many users, each with their own stored timezone — there
      // is no single "owner" here for the "always use the owner's timezone"
      // rule to apply to. `today` only ever feeds two approximate, aggregate
      // signals (the "active today" count and whether sample posts still
      // show), so the viewer's own browser zone is a reasonable, simple
      // reference point — not a per-user correctness value like day-of-75.
      const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await fetchFeed(viewerId, getEffectiveLogDate(viewerTimezone));
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
      setCursor(result.data.cursor);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, session, viewerId, reloadToken, toast, t]);

  const handleLoadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await fetchFeed(viewerId, getEffectiveLogDate(viewerTimezone), cursor);
    setLoadingMore(false);

    if (result.error || !result.data) {
      toast.error(result.error ?? t('status.loadFailed'));
      return;
    }

    setPosts((prev) => [...prev, ...result.data!.posts]);
    setCursor(result.data.cursor);
  };

  /** Optimistic: the count moves immediately, the write follows. */
  const handleReact = async (postId: string, phraseId: string) => {
    if (!viewerId) return;
    // Preview posts are not real rows, so there is nothing to react to.
    if (postId.startsWith('mock-post-')) return;

    const result = await addReaction(postId, viewerId, phraseId);
    if (result.error) toast.error(result.error);
  };

  const handleUnfollow = async (userId: string, undo: boolean) => {
    if (!viewerId) return;
    const result = undo ? await unhideFromFeed(viewerId, userId) : await hideFromFeed(viewerId, userId);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (undo) reload();
  };

  if (authLoading) return <div style={{ minHeight: '60dvh' }} />;

  // The feed is for participants only (start.md §5).
  if (!session) {
    return (
      <div className="container page" style={{ maxWidth: '520px' }}>
        <div className="glass-card state-card">
          <h2 className="h-page">{t('feed.loginRequired')}</h2>
          <div className="state-actions">
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
    <div className="container page feed-page">
      {/* Community counters */}
      <div className="glass-card feed-stats">
        <div className="feed-stats-head">
          <div className="feed-stats-icon">
            <Users size={22} color="var(--accent-orange)" />
          </div>
          <h4 style={{ fontSize: '1rem' }}>{t('feed.statsTitle')}</h4>
        </div>

        <div className="feed-stats-numbers">
          <div>
            <div className="feed-stat-value" style={{ color: 'var(--accent-orange)' }}>
              {activeToday}
            </div>
            <div className="feed-stat-label">{t('feed.activeToday')}</div>
          </div>
          <div>
            <div className="feed-stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {totalUsers}
            </div>
            <div className="feed-stat-label">{t('feed.totalUsers')}</div>
          </div>
        </div>
      </div>

      <h3 className="h-section feed-title">
        <Flame size={20} color="var(--accent-orange)" />
        {t('feed.liveTitle')}
      </h3>

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
        <div className="stack">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} onUnfollow={handleUnfollow} onReact={handleReact} />
          ))}
        </div>
      )}

      {!loading && !showingPreviews && cursor && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="btn btn-secondary btn-block"
          style={{ marginTop: '1.25rem' }}
          disabled={loadingMore}
        >
          {loadingMore ? t('common.loading') : t('feed.loadMore')}
        </button>
      )}
    </div>
  );
}
