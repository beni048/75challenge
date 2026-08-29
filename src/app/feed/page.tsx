'use client';

import React, { useState, useEffect } from 'react';
import FeedCard from '@/components/FeedCard';
import { FeedPost, STATIC_MOCK_FEED_POSTS } from '@/lib/feed';
import { Flame, Shield, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { ReactionType } from '@/components/HypeButton';

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>(STATIC_MOCK_FEED_POSTS);
  const [unfollowedUserIds, setUnfollowedUserIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'milestones'>('all');

  const handleUnfollow = (userId: string) => {
    setUnfollowedUserIds((prev) => [...prev, userId]);
  };

  const handleReact = (postId: string, type: ReactionType) => {
    // In live deployment, posts optimistic update or invokes Supabase RPC
    console.log(`Reacted ${type} to post ${postId}`);
  };

  // Filter posts
  const visiblePosts = posts
    .filter((post) => !unfollowedUserIds.includes(post.user_id))
    // Positive-only requirement: only completed or shielded posts render
    .filter((post) => post.status === 'completed' || post.status === 'shielded');

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '780px' }}>
      {/* Top Running Weekly Activity Tracker */}
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
              background: 'rgba(255, 90, 31, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} color="var(--accent-orange)" />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>Community Velocity</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              100% Positive accountability • 0 Downvotes • 3 AM local cutoff
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-orange)' }}>98.4%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Streak Completion</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>142</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Squads</div>
          </div>
        </div>
      </div>

      {/* Feed Stream Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={20} color="var(--accent-orange)" />
          Live Community Feed
        </h3>

        <span className="badge badge-fire" style={{ fontSize: '0.75rem' }}>
          Positive-Only Hype
        </span>
      </div>

      {/* Feed Posts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {visiblePosts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            onUnfollow={handleUnfollow}
            onReact={handleReact}
          />
        ))}
      </div>
    </div>
  );
}
