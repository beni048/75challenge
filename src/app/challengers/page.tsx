'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import Avatar from '@/components/Avatar';
import { fetchAllChallengers, ChallengerListEntry } from '@/lib/db/profile';
import { calculateCurrentDay, getEffectiveLogDate } from '@/lib/date-utils';

const PAGE_SIZE = 20;

export default function ChallengersPage() {
  const { t } = useI18n();
  const { session, loading } = useChallenge();

  const [entries, setEntries] = useState<ChallengerListEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    let active = true;

    fetchAllChallengers(0, PAGE_SIZE).then((result) => {
      if (!active) return;
      setEntries(result.data?.entries ?? []);
      setHasMore(result.data?.hasMore ?? false);
      setLoadingPage(false);
    });

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

  if (loading) {
    return <div style={{ minHeight: '60vh' }} />;
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
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
            const day = calculateCurrentDay(entry.startDate, getEffectiveLogDate(entry.timezone));
            return (
              <Link
                key={entry.username}
                href={`/user/${entry.username}`}
                className="glass-card"
                style={{
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    flexShrink: 0,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--gradient-avatar)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    overflow: 'hidden',
                  }}
                >
                  <Avatar url={entry.avatarUrl} displayName={entry.displayName} username={entry.username} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{entry.displayName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{entry.username}</div>
                </div>
                <span style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {t('feed.dayOf75', { day })}
                </span>
              </Link>
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
