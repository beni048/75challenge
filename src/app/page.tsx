'use client';

import LandingPreview from '@/components/LandingPreview';
import FeedStream from '@/components/FeedStream';
import { useChallenge } from '@/components/ChallengeProvider';

/**
 * The landing route serves two audiences: signed-in participants get the
 * community feed, visitors get the hero, introduction, and a read-only preview
 * of the feed.
 *
 * The marketing view is what renders on the server — the auth session is only
 * known in the browser, and a public landing page that ships an empty document
 * would be invisible to crawlers. A signed-in visitor never sees it flash: the
 * pre-paint script stamps `data-session="in"` on <html>, and `.landing-gate` is
 * hidden by CSS until React swaps in the feed.
 */
export default function HomePage() {
  const { session, loading } = useChallenge();

  if (!loading && session) {
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
