'use client';

/**
 * The "who I've hidden" blocklist.
 *
 * There is no separate follow table — this app defaults to following
 * everyone on the platform (start.md §5), so "following" is simply "not on
 * this list". `fetchFeed` (src/lib/db/feed.ts) already reads `user_unfollows`
 * directly for its own filtering; this module is the one place everything
 * else (the directory, a profile's follow toggle, the account settings page)
 * reads and writes that same table, so there is a single name for the
 * concept instead of two "unfollow" functions that did different things.
 */

import { createClient } from '../supabase/client';
import { DbResult, ok, fail } from './types';

/** Every user id this viewer has hidden from their own feed. */
export async function fetchHiddenUserIds(viewerId: string): Promise<DbResult<Set<string>>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_unfollows')
      .select('unfollowed_id')
      .eq('follower_id', viewerId);

    if (error) return fail(error);
    return ok(new Set((data ?? []).map((row: { unfollowed_id: string }) => row.unfollowed_id)));
  } catch (error) {
    return fail(error);
  }
}

/** Hides a participant's posts from this viewer's feed. */
export async function hideFromFeed(viewerId: string, targetId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_unfollows')
      .upsert({ follower_id: viewerId, unfollowed_id: targetId });

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Undoes a hide — following (the default) resumes. */
export async function unhideFromFeed(viewerId: string, targetId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_unfollows')
      .delete()
      .eq('follower_id', viewerId)
      .eq('unfollowed_id', targetId);

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}
