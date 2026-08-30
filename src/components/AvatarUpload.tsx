'use client';

/**
 * Wraps an avatar so tapping it replaces the picture.
 *
 * The compress → upload → persist → refresh sequence lives here once, rather
 * than being repeated at each place a participant can change their photo
 * (Account settings and their own challenge page). It is easy to get subtly
 * wrong — the object URL has to be revoked, the input value has to be cleared
 * so re-picking the same file fires `change` again, and the durable Storage
 * URL rather than the blob preview is what gets persisted (start.md §9).
 *
 * Renders as a `<label>` with a hidden file input: that is natively keyboard
 * reachable and needs no click handler of its own.
 */

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from './Toast';
import { useChallenge } from './ChallengeProvider';
import { uploadAvatar } from '@/lib/db/avatar';
import { updateProfile } from '@/lib/db/profile';
import {
  compressImageToWebP,
  AVATAR_MAX_DIMENSION_PX,
  AVATAR_QUALITY,
  AVATAR_TARGET_KB,
} from '@/lib/image-compressor';

interface AvatarUploadProps {
  /** The avatar to make tappable — usually an <Avatar />. */
  children: React.ReactNode;
  /** Extra classes on the wrapper, so callers keep their own sizing. */
  className?: string;
}

export default function AvatarUpload({ children, className = '' }: AvatarUploadProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { challenge, refresh } = useChallenge();
  const [busy, setBusy] = useState(false);

  if (!challenge) return <>{children}</>;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const compressed = await compressImageToWebP(
        file,
        AVATAR_MAX_DIMENSION_PX,
        AVATAR_MAX_DIMENSION_PX,
        AVATAR_QUALITY,
        AVATAR_TARGET_KB
      );
      // Only the blob is uploaded; the preview URL would leak otherwise.
      URL.revokeObjectURL(compressed.previewUrl);

      const uploaded = await uploadAvatar(challenge.id, compressed.blob);
      if (uploaded.error) {
        toast.error(uploaded.error);
        return;
      }

      const updated = await updateProfile(challenge.id, { avatarUrl: uploaded.data });
      if (updated.error) {
        toast.error(updated.error);
        return;
      }

      await refresh();
      toast.success(t('account.profileSaved'));
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(t('auth.failed'));
    } finally {
      setBusy(false);
      // Clearing the value lets the same file be picked again — without this,
      // re-selecting it fires no `change` event and nothing happens.
      e.target.value = '';
    }
  };

  return (
    <label className={`avatar-upload ${className}`.trim()} title={t('auth.avatarChange')}>
      {children}

      <span className="avatar-upload-badge" aria-hidden="true">
        <Camera size={14} />
      </span>

      {busy && <span className="avatar-upload-busy" aria-hidden="true" />}

      <input
        type="file"
        accept="image/*"
        className="avatar-upload-input"
        onChange={handleSelect}
        disabled={busy}
        aria-label={t('auth.avatarChange')}
      />
    </label>
  );
}
