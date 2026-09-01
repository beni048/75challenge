'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import Avatar from '@/components/Avatar';
import FollowToggle from '@/components/FollowToggle';
import { fetchAllChallengers, ChallengerListEntry } from '@/lib/db/profile';
import { fetchHiddenUserIds, hideFromFeed, unhideFromFeed } from '@/lib/db/network';
import { calculateCurrentDay, getEffectiveLogDate, hasStarted } from '@/lib/date-utils';

const PAGE_SIZE = 20;

export default function ChallengersPage() {
  const { t } = useI18n();
  const { session, challenge, loading } = useChallenge();

  const [entries, setEntries] = useState<ChallengerListEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // One bulk lookup for the whole page, not one query per card.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    let active = true;

    Promise.all([fetchAllChallengers(0, PAGE_SIZE), fetchHiddenUserIds(session.user.id)]).then(
      ([challengersResult, hiddenResult]) => {
        if (!active) return;
        setEntries(challengersResult.data?.entries ?? []);
        setHasMore(challengersResult.data?.hasMore ?? false);
        if (hiddenResult.data) setHiddenIds(hiddenResult.data);
        setLoadingPage(false);
      }
    );

    return () => {
      active = false;
    };
  }, [loading, session]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const result = await fetchAllChallengers(entries.length, PAGE_SIZE);
    setLoadingMore(false);
    if (!result.data) return;
    setEntries((prev) => [...prev, ...result.data!.entries]);
    setHasMore(result.data.hasMore);
  };

  const handleToggleFollow = async (targetId: string) => {
    if (!session) return;
    const wasHidden = hiddenIds.has(targetId);

    // Optimistic.
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (wasHidden) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
    setFollowBusyId(targetId);

    const result = wasHidden
      ? await unhideFromFeed(session.user.id, targetId)
      : await hideFromFeed(session.user.id, targetId);

    setFollowBusyId(null);
    if (result.error) {
      // Revert.
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (wasHidden) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }
  };

  if (loading) {
    return <div style={{ minHeight: '60dvh' }} />;
  }

  if (!session) {
    return (
      <div className="container page" style={{ maxWidth: '520px' }}>
        <div className="glass-card state-card">
          <h2 className="h-page">{t('account.notLoggedIn')}</h2>
          <div className="state-actions">
            <Link href="/login" className="btn btn-secondary">
              {t('nav.login')}
            </Link>
            <Link href="/join" className="btn btn-primary">
              {t('nav.join')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: '640px' }}>
      <div className="challengers-head">
        <Users size={24} color="var(--accent-orange)" />
        <h1 className="h-page" style={{ marginBottom: 0 }}>
          {t('challengers.title')}
        </h1>
      </div>

      {loadingPage ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('challengers.empty')}</p>
      ) : (
        <div className="stack stack-tight">
          {entries.map((entry) => {
            const effectiveDate = getEffectiveLogDate(entry.timezone);
            // A future start date reads as Day 0, matching the profile page —
            // calculateCurrentDay alone clamps a future start to 1, which is
            // exactly the "Day 1" bug this row would otherwise reproduce.
            const day = hasStarted(entry.startDate, effectiveDate)
              ? calculateCurrentDay(entry.startDate, effectiveDate)
              : 0;
            const isSelf = entry.id === challenge?.id;
            return (
              <div key={entry.username} className="glass-card challenger-row">
                <Link href={`/user/${entry.username}`} className="challenger-row-link">
                  <div className="challenger-row-avatar">
                    <Avatar url={entry.avatarUrl} displayName={entry.displayName} username={entry.username} />
                  </div>
                  <div className="challenger-row-name">
                    <div className="challenger-row-display-name">{entry.displayName}</div>
                    <div className="challenger-row-username">@{entry.username}</div>
                  </div>
                  <span className="challenger-row-day" title={t('feed.dayOf75', { day })}>
                    {t('challengers.dayShort', { day })}
                  </span>
                </Link>

                {!isSelf && (
                  <FollowToggle
                    compact
                    hidden={hiddenIds.has(entry.id)}
                    busy={followBusyId === entry.id}
                    onToggle={() => handleToggleFollow(entry.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="btn btn-secondary btn-block"
          style={{ marginTop: '1.25rem' }}
          disabled={loadingMore}
        >
          {loadingMore ? t('common.loading') : t('challengers.loadMore')}
        </button>
      )}
    </div>
  );
}
