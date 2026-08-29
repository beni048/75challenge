'use client';

import LandingPreview from '@/components/LandingPreview';
import FeedStream from '@/components/FeedStream';
import { useSession } from '@/components/useSession';

/**
 * The landing route serves two audiences: signed-in participants get the
 * community feed, visitors get the hero, introduction, and a read-only preview
 * of the feed.
 *
 * The marketing view is what renders on the server — the session lives in
 * localStorage, which the server cannot see, and a public landing page that
 * ships an empty document would be invisible to crawlers. A signed-in visitor
 * never sees it flash: the pre-paint script stamps `data-session="in"` on
 * <html>, and `.landing-gate` is hidden by CSS until React swaps in the feed.
 */
export default function HomePage() {
  const { session, ready } = useSession();

  if (ready && session) {
    return (
      <div className="home-page">
        <FeedStream />
      </div>
    );
  }

  return (
    <div className="home-page landing-gate">
      <LandingPreview />
    </div>
  );
}
