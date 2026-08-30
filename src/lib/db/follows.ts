'use client';

/**
 * The real, reciprocal follow relationship — distinct from `user_unfollows`,
 * which only ever hides posts one-directionally in the *follower's own* feed
 * and carries no notion of a relationship the other party can see.
 *
 * `user_follows`' RLS only returns rows where the caller is one of the two
 * parties (see migration 0004), which is what makes "followers/following are
 * visible only on your own profile" a real, server-enforced guarantee rather
 * than something a client could bypass by querying someone else's list —
 * fetchFollowCounts/fetchFollowLists simply return nothing for a profile that
 * is not the caller's own.
 */

import { createClient } from '../supabase/client';
import { DbResult, ok, fail } from './types';

export async function followUser(followerId: string, followedId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_follows')
      .upsert({ follower_id: followerId, followed_id: followedId });

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

export async function unfollowUser(followerId: string, followedId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId);

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Whether `viewerId` currently follows `targetId`. */
export async function isFollowing(viewerId: string, targetId: string): Promise<DbResult<boolean>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('followed_id', targetId)
      .maybeSingle();

    if (error) return fail(error);
    return ok(Boolean(data));
  } catch (error) {
    return fail(error);
  }
}

export interface FollowCounts {
  followers: number;
  following: number;
}

/** Only meaningful, and only ever called, for the signed-in viewer's own id. */
export async function fetchFollowCounts(userId: string): Promise<DbResult<FollowCounts>> {
  try {
    const supabase = createClient();
    const [followers, following] = await Promise.all([
      supabase.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('user_follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    if (followers.error) return fail(followers.error);
    if (following.error) return fail(following.error);

    return ok({ followers: followers.count ?? 0, following: following.count ?? 0 });
  } catch (error) {
    return fail(error);
  }
}

export interface FollowListEntry {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Only meaningful, and only ever called, for the signed-in viewer's own id. */
export async function fetchFollowLists(
  userId: string
): Promise<DbResult<{ followers: FollowListEntry[]; following: FollowListEntry[] }>> {
  try {
    const supabase = createClient();
    const [followers, following] = await Promise.all([
      supabase
        .from('user_follows')
        .select('users:follower_id ( username, display_name, avatar_url )')
        .eq('followed_id', userId),
      supabase
        .from('user_follows')
        .select('users:followed_id ( username, display_name, avatar_url )')
        .eq('follower_id', userId),
    ]);

    if (followers.error) return fail(followers.error);
    if (following.error) return fail(following.error);

    type Row = { users: { username: string; display_name: string; avatar_url: string | null } | null };
    const toEntry = (row: Row): FollowListEntry | null =>
      row.users
        ? { username: row.users.username, displayName: row.users.display_name, avatarUrl: row.users.avatar_url }
        : null;

    return ok({
      followers: ((followers.data ?? []) as unknown as Row[]).map(toEntry).filter((e): e is FollowListEntry => e !== null),
      following: ((following.data ?? []) as unknown as Row[]).map(toEntry).filter((e): e is FollowListEntry => e !== null),
    });
  } catch (error) {
    return fail(error);
  }
}
