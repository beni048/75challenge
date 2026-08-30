'use client';

import LandingPreview from '@/components/LandingPreview';
import FeedStream from '@/components/FeedStream';
import PageSpinner from '@/components/PageSpinner';
import { useChallenge } from '@/components/ChallengeProvider';

/**
 * The landing route serves two audiences: signed-in participants get the
 * community feed, visitors get the hero, introduction, and a read-only preview
 * of the feed.
 *
 * Which one to render depends on the auth session, which is only known in the
 * browser — so until `ChallengeProvider` resolves it, this shows a brief,
 * honest loading state rather than guessing from a localStorage token's mere
 * presence. A guess can be wrong (a stale or expired token used to produce a
 * confusing blank feed instead of the real landing page); a loading state
 * never lies, it's just not instant.
 *
 * Deliberate tradeoff: the previous version server-rendered the marketing
 * copy unconditionally so crawlers always got real content, then hid it with
 * CSS for a signed-in visitor. This version's SSR/first-paint output is
 * always the spinner, so a crawler that doesn't execute JavaScript sees a
 * loading state rather than marketing copy — accepted here because a real
 * loading state matters more than that edge case, and any crawler that does
 * run JS (Googlebot included) still ends up on the same resolved content.
 */
export default function HomePage() {
  const { session, loading } = useChallenge();

  if (loading) {
    return <PageSpinner />;
  }

  if (session) {
    return (
      <div className="home-page">
        <FeedStream />
      </div>
    );
  }

  return (
    <div className="home-page">
      <LandingPreview />
    </div>
  );
}
