'use client';

import React, { useState } from 'react';
import { FeedPost, localizedCaption, localizedRules } from '@/lib/feed';
import HypeButton, { ReactionType } from './HypeButton';
import { CheckCircle2, UserMinus, UserCheck, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

interface FeedCardProps {
  post: FeedPost;
  /** `undo` is true when the viewer is re-following after hiding someone. */
  onUnfollow?: (userId: string, undo: boolean) => void;
  onReact?: (postId: string, type: ReactionType) => void;
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

  const handleToggleUnfollow = () => {
    const nextState = !isUnfollowed;
    setIsUnfollowed(nextState);
    // nextState === true means "now hidden", so undo is the inverse.
    onUnfollow?.(post.user_id, !nextState);
  };

  if (isUnfollowed) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          opacity: 0.7,
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {t('feed.hidden', { username: post.user.username })}
        </span>
        <button
          onClick={handleToggleUnfollow}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          <UserCheck size={14} /> {t('feed.undoUnfollow')}
        </button>
      </div>
    );
  }

  // A reset announcement is a plain, text-only card — no photo, rule chips,
  // or reactions (reactions.log_id references daily_logs, and this isn't one).
  if (post.kind === 'reset') {
    return (
      <div
        className="glass-card feed-card"
        style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}
      >
        <RotateCcw size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {t('feed.resetAnnouncement', { name: post.user.display_name })}
        </span>
      </div>
    );
  }

  const caption = post.batchCount
    ? t('feed.caughtUpMany', { count: post.batchCount })
    : localizedCaption(post, locale);
  const rules = localizedRules(post, locale);

  const reactors = post.reactors ?? [];
  const hypedByLine =
    reactors.length === 0
      ? null
      : reactors.length === 1
        ? t('feed.hypedBySingle', { name: reactors[0].displayName })
        : reactors.length === 2
          ? t('feed.hypedByTwo', { name: reactors[0].displayName, name2: reactors[1].displayName })
          : t('feed.hypedByMany', { name: reactors[0].displayName, count: reactors.length - 1 });

  return (
    <div className="glass-card feed-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-avatar)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            {post.user.display_name.charAt(0).toUpperCase()}
          </div>

          <div>
            <Link
              href={`/user/${post.user.username}`}
              style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}
            >
              {post.user.display_name}
            </Link>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span>@{post.user.username}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
                {t('feed.dayOf75', { day: post.day_number })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={`badge ${post.status === 'completed' ? 'badge-success' : 'badge-shield'}`}>
            {post.status === 'completed' ? t('feed.statusCompleted') : t('feed.statusShielded')}
          </span>

          <button
            onClick={handleToggleUnfollow}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
            }}
            title={t('feed.unfollow')}
            aria-label={t('feed.unfollowNamed', { username: post.user.username })}
          >
            <UserMinus size={16} />
          </button>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{caption}</p>
      )}

      {/* Proof photo */}
      {post.photo_url && !photoFailed && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'var(--photo-backdrop)',
            border: '1px solid var(--border-subtle)',
            // 4:5, matching how phones actually shoot — see the comment on
            // .preview-card-photo in globals.css.
            aspectRatio: '4 / 5',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- user proof photos
              arrive as blob:/data: URLs from client-side compression, which the
              next/image optimizer cannot process. */}
          <img
            src={post.photo_url}
            alt={t('feed.photoAlt')}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Checked-off rules */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
        {rules.map((rule, idx) => (
          <span
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--chip-bg)',
              padding: '0.3rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <CheckCircle2 size={14} color="var(--accent-green)" />
            {rule}
          </span>
        ))}
      </div>

      {/* Reactions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <HypeButton
          postId={post.id}
          reactions={post.reactions}
          userReactions={post.user_reactions}
          onReact={(type) => onReact && onReact(post.id, type)}
        />

        {post.is_mock && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('feed.previewPost')}</span>
        )}
      </div>

      {hypedByLine && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hypedByLine}</p>}
    </div>
  );
}
