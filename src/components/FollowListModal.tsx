'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import ModalPortal from './ModalPortal';
import Avatar from './Avatar';
import type { FollowListEntry } from '@/lib/db/follows';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: 'followers' | 'following';
  followers: FollowListEntry[];
  following: FollowListEntry[];
}

/** Own-profile-only — see start.md §5: follow lists are never shown for anyone else. */
export default function FollowListModal({ isOpen, onClose, initialTab, followers, following }: FollowListModalProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState(initialTab);

  const entries = tab === 'followers' ? followers : following;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <AnimatePresence>
        {isOpen && (
          <div className="modal-backdrop" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '420px' }}
              role="dialog"
              aria-modal="true"
              aria-label={t('profile.followersTitle')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setTab('followers')}
                    className={`btn btn-sm ${tab === 'followers' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t('profile.followersCount', { count: followers.length })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('following')}
                    className={`btn btn-sm ${tab === 'following' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t('profile.followingCount', { count: following.length })}
                  </button>
                </div>
                <button onClick={onClose} aria-label={t('shield.close')} className="icon-btn">
                  <X size={18} />
                </button>
              </div>

              {entries.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {tab === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing')}
                </p>
              ) : (
                <div className="stack stack-tight">
                  {entries.map((entry) => (
                    <Link
                      key={entry.username}
                      href={`/user/${entry.username}`}
                      onClick={onClose}
                      className="glass-card"
                      style={{ padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'inherit' }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--gradient-avatar)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                        }}
                      >
                        <Avatar url={entry.avatarUrl} displayName={entry.displayName} username={entry.username} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{entry.displayName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{entry.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
