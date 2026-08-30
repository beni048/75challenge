'use client';

import React, { useState } from 'react';
import { FeedPost, localizedCaption, localizedRules } from '@/lib/feed';
import HypeButton from './HypeButton';
import { CheckCircle2, UserMinus, UserCheck, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { getHypePhrase, localizedHypePhrase } from '@/lib/hype-phrases';

interface FeedCardProps {
  post: FeedPost;
  /** `undo` is true when the viewer is re-following after hiding someone. */
  onUnfollow?: (userId: string, undo: boolean) => void;
  onReact?: (postId: string, phraseId: string) => void;
}

export default function FeedCard({ post, onUnfollow, onReact }: FeedCardProps) {
  const { t, locale } = useI18n();
  const [isUnfollowed, setIsUnfollowed] = useState(false);
  // A stored photo_url can outlive its object: the storage-cleanup job clears
  // the column and deletes the file, and a crash between those two steps
  // leaves a row pointing at a 404. Collapsing to the no-photo state on load
  // failure reuses the branch the card already has for a null photo_url,
  // rather than showing a broken image on someone else's feed.
  const [photoFailed, setPhotoFailed] = useState(false);

  // The claimed sentence is held locally as well as on the post, so it appears
  // the instant you claim it rather than after the next feed refetch. Reset
  // during render when the server value changes, per React's own pattern.
  const [prevClaimed, setPrevClaimed] = useState(post.hypePhraseId ?? null);
  const [claimedId, setClaimedId] = useState<string | null>(post.hypePhraseId ?? null);
  const [claimedName, setClaimedName] = useState<string | null>(
    post.hypeClaimedBy?.displayName ?? null
  );
  if ((post.hypePhraseId ?? null) !== prevClaimed) {
    setPrevClaimed(post.hypePhraseId ?? null);
    setClaimedId(post.hypePhraseId ?? null);
    setClaimedName(post.hypeClaimedBy?.displayName ?? null);
  }

  const handleToggleUnfollow = () => {
    const nextState = !isUnfollowed;
    setIsUnfollowed(nextState);
    // nextState === true means "now hidden", so undo is the inverse.
    onUnfollow?.(post.user_id, !nextState);
  };

  if (isUnfollowed) {
    return (
      <div className="glass-card feed-card-hidden">
        <span className="feed-card-hidden-note">{t('feed.hidden', { username: post.user.username })}</span>
        <button onClick={handleToggleUnfollow} className="btn btn-secondary btn-sm">
          <UserCheck size={14} /> {t('feed.undoUnfollow')}
        </button>
      </div>
    );
  }

  // A reset announcement is a plain, text-only card — no photo, rule chips,
  // or hype (a reaction always references a daily_logs row, and this isn't one).
  if (post.kind === 'reset') {
    return (
      <div className="glass-card feed-card feed-card-reset">
        <RotateCcw size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span>{t('feed.resetAnnouncement', { name: post.user.display_name })}</span>
      </div>
    );
  }

  const caption = post.batchCount
    ? t('feed.caughtUpMany', { count: post.batchCount })
    : localizedCaption(post, locale);
  const rules = localizedRules(post, locale);

  // One sentence per post, claimed by whoever hyped first; everyone after
  // agrees with it. Rendered in the language it was sent in — it is a quote
  // from a person, not app copy (see hype-phrases.ts).
  const claimedPhrase = claimedId ? getHypePhrase(claimedId) : undefined;
  const claimedText = claimedPhrase
    ? localizedHypePhrase(claimedPhrase, { days: post.day_number })
    : null;
  const agreed = post.agreedBy ?? [];
  const agreeLine =
    agreed.length === 0
      ? null
      : agreed.length === 1
        ? t('hype.agreedOne', { name: agreed[0].displayName })
        : t('hype.agreedMany', { name: agreed[0].displayName, count: agreed.length - 1 });

  return (
    <div className="glass-card feed-card">
      {/* Header */}
      <div className="feed-card-head">
        <div className="feed-card-identity">
          <div className="feed-card-avatar" aria-hidden="true">
            {post.user.display_name.charAt(0).toUpperCase()}
          </div>

          <div>
            <Link href={`/user/${post.user.username}`} className="feed-card-name">
              {post.user.display_name}
            </Link>
            <div className="feed-card-meta">
              <span>@{post.user.username}</span>
              <span>•</span>
              <span className="feed-card-day">{t('feed.dayOf75', { day: post.day_number })}</span>
            </div>
          </div>
        </div>

        <div className="feed-card-head-actions">
          <span className={`badge ${post.status === 'completed' ? 'badge-success' : 'badge-shield'}`}>
            {post.status === 'completed' ? t('feed.statusCompleted') : t('feed.statusShielded')}
          </span>

          <button
            onClick={handleToggleUnfollow}
            className="icon-btn"
            title={t('feed.unfollow')}
            aria-label={t('feed.unfollowNamed', { username: post.user.username })}
          >
            <UserMinus size={16} />
          </button>
        </div>
      </div>

      {/* Caption */}
      {caption && <p className="feed-card-caption">{caption}</p>}

      {/* Proof photo */}
      {post.photo_url && !photoFailed && (
        <div className="feed-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- user proof photos
              arrive as blob:/data: URLs from client-side compression, which the
              next/image optimizer cannot process. */}
          <img
            src={post.photo_url}
            alt={t('feed.photoAlt')}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        </div>
      )}

      {/* Checked-off rules */}
      <div className="feed-card-rules">
        {rules.map((rule, idx) => (
          <span key={idx} className="rule-chip">
            <CheckCircle2 size={14} color="var(--accent-green)" />
            {rule}
          </span>
        ))}
      </div>

      {/* Hype */}
      <div className="feed-card-reactions">
        <HypeButton
          hypeCount={post.hypeCount}
          dayNumber={post.day_number}
          claimedPhraseId={claimedId}
          hasHyped={post.viewerHasHyped}
          onHype={(phraseId) => {
            // Show it immediately; the server value takes over on next fetch.
            if (!claimedId) setClaimedId(phraseId);
            onReact?.(post.id, phraseId);
          }}
        />

        {post.is_mock && <span className="feed-card-preview-note">{t('feed.previewPost')}</span>}
      </div>

      {claimedText && (
        <div className="feed-card-hype">
          <p className="feed-card-hype-line">
            <strong>{t('hype.says', { name: claimedName ?? t('hype.you') })}</strong>{' '}
            <span className="feed-card-hype-quote">“{claimedText}”</span>
          </p>
          {agreeLine && <p className="feed-card-hype-agree">{agreeLine}</p>}
        </div>
      )}
    </div>
  );
}
