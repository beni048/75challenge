'use client';

/**
 * The app's single source of truth for "who is signed in and what is their
 * challenge".
 *
 * Flow:
 *   Supabase auth session  →  users row  →  rules + daily_logs
 *
 * Everything downstream (header, profile, feed) reads from here rather than
 * from localStorage, so a participant's challenge follows them to any device.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { fetchChallengeById, createChallenge } from '@/lib/db/profile';
import { clearPendingSignup, loadPendingSignup } from '@/lib/pending-signup';
import type { Challenge } from '@/lib/db/types';

interface ChallengeContextValue {
  /** The Supabase auth session, or null when signed out. */
  session: Session | null;
  /** The signed-in user's challenge, or null if they have not created one. */
  challenge: Challenge | null;
  /** True until the first auth + challenge read settles. */
  loading: boolean;
  /** Re-reads the challenge from the database. */
  refresh: () => Promise<void>;
  /** Applies a local edit immediately, before/instead of a re-read. */
  setChallenge: (challenge: Challenge | null) => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export default function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Loads the challenge for a signed-in user, creating it first if this is the
   * first authenticated visit after a signup that could not write immediately
   * (email-confirmation flow — see src/lib/pending-signup.ts).
   */
  const loadChallenge = useCallback(async (userId: string) => {
    const existing = await fetchChallengeById(userId);

    if (existing.data) {
      setChallenge(existing.data);
      clearPendingSignup();
      return;
    }

    const pending = loadPendingSignup();
    if (!pending) {
      setChallenge(null);
      return;
    }

    const created = await createChallenge({
      userId,
      displayName: pending.displayName,
      startDate: pending.startDate,
      rules: pending.rules,
      referredByUsername: pending.referredByUsername,
    });

    if (created.data) {
      setChallenge(created.data);
      clearPendingSignup();
    } else {
      setChallenge(null);
    }
  }, []);

  // Subscribe to auth. `onAuthStateChange` fires immediately with the restored
  // session, so this covers both first load and later sign-in/sign-out.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      if (nextSession?.user) {
        await loadChallenge(nextSession.user.id);
      } else {
        setChallenge(null);
      }
      setLoading(false);
    });

    // Belt and braces: if the listener never fires (misconfigured project),
    // still resolve the loading state rather than spinning forever.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadChallenge]);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    const result = await fetchChallengeById(session.user.id);
    if (result.data) setChallenge(result.data);
  }, [session]);

  return (
    <ChallengeContext.Provider value={{ session, challenge, loading, refresh, setChallenge }}>
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge(): ChallengeContextValue {
  const ctx = useContext(ChallengeContext);
  if (!ctx) {
    // Rendered outside the provider (isolated unit tests): behave as signed out
    // rather than crashing.
    return {
      session: null,
      challenge: null,
      loading: false,
      refresh: async () => {},
      setChallenge: () => {},
    };
  }
  return ctx;
}
