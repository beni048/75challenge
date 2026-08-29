'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export type ReactionType = 'fire' | 'beast' | 'launch' | 'hype';

const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  fire: { emoji: '🔥', label: 'Fire', color: 'var(--accent-orange)' },
  beast: { emoji: '💪', label: 'Beast', color: 'var(--accent-green)' },
  launch: { emoji: '🚀', label: 'Launch', color: 'var(--accent-cyan)' },
  hype: { emoji: '🙌', label: 'Hype', color: 'var(--accent-purple)' },
};

interface HypeButtonProps {
  postId: string;
  reactions: {
    fire: number;
    beast: number;
    launch: number;
    hype: number;
  };
  userReactions?: string[];
  onReact?: (type: ReactionType) => void;
}

export default function HypeButton({
  postId,
  reactions: initialReactions,
  userReactions: initialUserReactions = [],
  onReact,
}: HypeButtonProps) {
  const [counts, setCounts] = useState(initialReactions);
  const [activeReactions, setActiveReactions] = useState<string[]>(initialUserReactions);

  const handleTapReaction = (e: React.MouseEvent, type: ReactionType) => {
    e.stopPropagation();

    // Optimistic UI update
    setCounts((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));

    if (!activeReactions.includes(type)) {
      setActiveReactions((prev) => [...prev, type]);
    }

    // Trigger celebratory canvas-confetti from button coordinates
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 18,
      spread: 45,
      origin: { x, y },
      colors: ['#ff5a1f', '#00e5ff', '#10b981', '#8b5cf6'],
      ticks: 80,
      disableForReducedMotion: true,
    });

    if (onReact) {
      onReact(type);
    }
  };

  return (
    <div
      className="hype-button-group"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        flexWrap: 'wrap',
      }}
    >
      {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((type) => {
        const item = REACTION_CONFIG[type];
        const count = counts[type] || 0;
        const isSelected = activeReactions.includes(type);

        return (
          <motion.button
            key={type}
            whileTap={{ scale: 1.25, rotate: [-5, 5, 0] }}
            whileHover={{ scale: 1.08 }}
            onClick={(e) => handleTapReaction(e, type)}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'var(--bg-tertiary)',
              borderColor: isSelected ? item.color : 'var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
            }}
            title={`Give ${item.label} hype`}
          >
            <span style={{ fontSize: '1rem' }}>{item.emoji}</span>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isSelected ? item.color : 'var(--text-secondary)' }}>
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
