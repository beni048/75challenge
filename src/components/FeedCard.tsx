'use client';

import React, { useState } from 'react';
import { FeedPost } from '@/lib/feed';
import HypeButton, { ReactionType } from './HypeButton';
import { CheckCircle2, UserMinus, UserCheck, Flame, Shield } from 'lucide-react';
import Link from 'next/link';

interface FeedCardProps {
  post: FeedPost;
  onUnfollow?: (userId: string) => void;
  onReact?: (postId: string, type: ReactionType) => void;
}

export default function FeedCard({ post, onUnfollow, onReact }: FeedCardProps) {
  const [isUnfollowed, setIsUnfollowed] = useState(false);

  const handleToggleUnfollow = () => {
    const nextState = !isUnfollowed;
    setIsUnfollowed(nextState);
    if (onUnfollow) {
      onUnfollow(post.user_id);
    }
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
          opacity: 0.6,
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Posts from @{post.user.username} are hidden.
        </span>
        <button
          onClick={handleToggleUnfollow}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          <UserCheck size={14} /> Undo Unfollow
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(255,90,31,0.2) 0%, rgba(0,229,255,0.2) 100%)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#fff',
            }}
          >
            {post.user.display_name.charAt(0).toUpperCase()}
          </div>

          <div>
            <Link
              href={`/user/${post.user.username}`}
              style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}
              className="hover:underline"
            >
              {post.user.display_name}
            </Link>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>@{post.user.username}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
                Day {post.day_number} of 75
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={`badge ${post.status === 'completed' ? 'badge-success' : 'badge-shield'}`}>
            {post.status === 'completed' ? 'Day Completed' : 'Shield Used'}
          </span>

          <button
            onClick={handleToggleUnfollow}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
            title="Unfollow user from feed"
            aria-label={`Unfollow ${post.user.username}`}
          >
            <UserMinus size={16} />
          </button>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {post.caption}
        </p>
      )}

      {/* Photo (if uploaded) */}
      {post.photo_url && (
        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: '400px', background: '#000' }}>
          <img
            src={post.photo_url}
            alt="Daily check-in"
            style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Checked-off Rules */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
        {post.completed_rules.map((rule, idx) => (
          <span
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 255, 255, 0.05)',
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

      {/* Reactions Bar with HypeButton */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.85rem',
        }}
      >
        <HypeButton
          postId={post.id}
          reactions={post.reactions}
          userReactions={post.user_reactions}
          onReact={(type) => onReact && onReact(post.id, type)}
        />

        {post.is_mock && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Preview Post
          </span>
        )}
      </div>
    </div>
  );
}
