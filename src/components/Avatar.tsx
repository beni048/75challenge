'use client';

/**
 * Fills whatever circular container the caller already has (`.nav-avatar`,
 * `.profile-avatar`, ...) with either the real picture or the existing
 * initial-letter fallback — deliberately has no sizing of its own, so the
 * caller's own CSS class keeps controlling dimensions/responsiveness exactly
 * as it did before an avatar existed.
 */

import React from 'react';

export default function Avatar({
  url,
  displayName,
  username,
}: {
  url: string | null | undefined;
  displayName: string;
  username?: string;
}) {
  if (url) {
    // Fills a fixed-size circular container at a handful of small call sites;
    // not worth a next/image config for avatar thumbnails alone.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return <>{(displayName || username || '?').charAt(0).toUpperCase()}</>;
}
