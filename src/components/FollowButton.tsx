'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from './Toast';
import { followUser, unfollowUser, isFollowing } from '@/lib/db/follows';

export default function FollowButton({ viewerId, targetId }: { viewerId: string; targetId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    isFollowing(viewerId, targetId).then((result) => {
      if (active) setFollowing(result.data ?? false);
    });
    return () => {
      active = false;
    };
  }, [viewerId, targetId]);

  const handleToggle = async () => {
    if (following === null) return;
    const next = !following;
    setFollowing(next); // optimistic
    setBusy(true);

    const result = next ? await followUser(viewerId, targetId) : await unfollowUser(viewerId, targetId);

    setBusy(false);
    if (result.error) {
      setFollowing(!next); // revert
      toast.error(result.error);
    }
  };

  if (following === null) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`}
    >
      {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
      {following ? t('profile.following') : t('profile.follow')}
    </button>
  );
}
