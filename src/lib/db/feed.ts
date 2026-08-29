'use client';

/**
 * The community feed query.
 *
 * Only 'completed' and 'shielded' days are ever returned — the positive-only
 * guarantee (start.md §5). That is enforced by RLS as well as by the filter
 * here, so a crafted client request cannot surface someone's failed day.
 */

import { createClient } from '../supabase/client';
import { calculateCurrentDay } from '../date-utils';
import { FeedPost, STATIC_MOCK_FEED_POSTS } from '../feed';
import { DbResult, ok, fail, ReactionType } from './types';

const FEED_PAGE_SIZE = 50;

/**
 * Whether to pad the feed with curated preview posts.
 *
 * The previews exist so a brand-new community does not look abandoned. The
 * moment a real participant has checked in *today*, the feed can stand on its
 * own and the samples are dropped — seeing them next to genuine activity makes
 * the feed feel fake.
 */
export function shouldShowPreviews(realPostsToday: number): boolean {
  return realPostsToday === 0;
}

interface FeedRow {
  id: string;
  user_id: string;
  log_date: string;
  status: 'completed' | 'shielded';
  photo_url: string | null;
  caption: string | null;
  created_at: string;
  users: { username: string; display_name: string; start_date: string } | null;
  log_rule_checks: { is_completed: boolean; rules: { title: string } | null }[];
  reactions: { reaction_type: ReactionType; reaction_count: number; sender_id: string }[];
}

function toFeedPost(row: FeedRow, viewerId: string | null): FeedPost {
  const reactions = { fire: 0, beast: 0, launch: 0, hype: 0 };
  const mine: string[] = [];

  for (const reaction of row.reactions ?? []) {
    reactions[reaction.reaction_type] += reaction.reaction_count;
    if (reaction.sender_id === viewerId) mine.push(reaction.reaction_type);
  }

  const completedRules = (row.log_rule_checks ?? [])
    .filter((check) => check.is_completed && check.rules)
    .map((check) => check.rules!.title);

  return {
    id: row.id,
    user_id: row.user_id,
    user: {
      username: row.users?.username ?? 'challenger',
      display_name: row.users?.display_name ?? 'Challenger',
    },
    // Derived from the participant's start date, never stored.
    day_number: row.users ? calculateCurrentDay(row.users.start_date, row.log_date) : 1,
    log_date: row.log_date,
    status: row.status,
    photo_url: row.photo_url,
    caption: row.caption,
    completed_rules: completedRules,
    total_rules: (row.log_rule_checks ?? []).length,
    created_at: row.created_at,
    reactions,
    user_reactions: mine,
  };
}

export interface FeedResult {
  posts: FeedPost[];
  /** Total registered participants, shown in the header counters. */
  totalUsers: number;
  /** Distinct participants who logged a day today. */
  activeToday: number;
  /** True when curated preview posts were appended because nobody posted today. */
  showingPreviews: boolean;
}

/**
 * Loads the feed for the signed-in viewer.
 *
 * Unfollowed users are filtered out, and while fewer than two people have
 * registered the curated preview posts are appended so the page is not empty.
 */
export async function fetchFeed(viewerId: string | null, today: string): Promise<DbResult<FeedResult>> {
  try {
    const supabase = createClient();

    const [logsResult, countResult, unfollowResult] = await Promise.all([
      supabase
        .from('daily_logs')
        .select(
          `id, user_id, log_date, status, photo_url, caption, created_at,
           users ( username, display_name, start_date ),
           log_rule_checks ( is_completed, rules ( title ) ),
           reactions ( reaction_type, reaction_count, sender_id )`
        )
        .in('status', ['completed', 'shielded'])
        .order('created_at', { ascending: false })
        .limit(FEED_PAGE_SIZE),
      supabase.rpc('participant_count'),
      viewerId
        ? supabase.from('user_unfollows').select('unfollowed_id').eq('follower_id', viewerId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (logsResult.error) return fail(logsResult.error);

    const hidden = new Set(
      (unfollowResult.data ?? []).map((row: { unfollowed_id: string }) => row.unfollowed_id)
    );

    const rows = (logsResult.data ?? []) as unknown as FeedRow[];
    const posts = rows.filter((row) => !hidden.has(row.user_id)).map((row) => toFeedPost(row, viewerId));

    const totalUsers = typeof countResult.data === 'number' ? countResult.data : 0;
    const activeToday = new Set(
      rows.filter((row) => row.log_date === today).map((row) => row.user_id)
    ).size;

    const showingPreviews = shouldShowPreviews(posts.filter((p) => p.log_date === today).length);

    return ok({
      // Real activity always comes first; previews only pad the tail.
      posts: showingPreviews ? [...posts, ...STATIC_MOCK_FEED_POSTS] : posts,
      totalUsers,
      activeToday,
      showingPreviews,
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Records one tap of a reaction.
 *
 * Multi-tap is supported by incrementing an existing row, so the count reflects
 * enthusiasm rather than a simple like. There is deliberately no way to
 * decrement or to send a negative type (start.md §7).
 */
export async function addReaction(
  logId: string,
  senderId: string,
  type: ReactionType
): Promise<DbResult<true>> {
  try {
    const supabase = createClient();

    const { data: existing } = await supabase
      .from('reactions')
      .select('reaction_count')
      .eq('log_id', logId)
      .eq('sender_id', senderId)
      .eq('reaction_type', type)
      .maybeSingle();

    const { error } = await supabase.from('reactions').upsert(
      {
        log_id: logId,
        sender_id: senderId,
        reaction_type: type,
        reaction_count: (existing?.reaction_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'log_id,sender_id,reaction_type' }
    );

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Hides a participant's posts from this viewer's feed. */
export async function unfollowUser(followerId: string, unfollowedId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_unfollows')
      .upsert({ follower_id: followerId, unfollowed_id: unfollowedId });

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Undoes an unfollow. */
export async function refollowUser(followerId: string, unfollowedId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_unfollows')
      .delete()
      .eq('follower_id', followerId)
      .eq('unfollowed_id', unfollowedId);

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}
