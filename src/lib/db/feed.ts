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
  batch_id: string | null;
  users: { username: string; display_name: string; start_date: string } | null;
  log_rule_checks: { rule_id: string; is_completed: boolean }[];
  reactions: { reaction_type: ReactionType; reaction_count: number; sender_id: string }[];
}

/**
 * `rule_id -> title`, only for rules visible to the current viewer. A missing
 * key means that rule is either not completed or, for a secret rule whose
 * owner chose "hidden", deliberately omitted — never fall back to fetching
 * the raw `rules` table to fill the gap.
 */
type RuleTitleMap = Map<string, string>;

function toFeedPost(row: FeedRow, viewerId: string | null, ruleTitles: RuleTitleMap, batchCount?: number): FeedPost {
  const reactions = { fire: 0, beast: 0, launch: 0, hype: 0 };
  const mine: string[] = [];

  for (const reaction of row.reactions ?? []) {
    reactions[reaction.reaction_type] += reaction.reaction_count;
    if (reaction.sender_id === viewerId) mine.push(reaction.reaction_type);
  }

  // A "hidden" secret rule (owner's own choice) is absent from ruleTitles
  // entirely, and is dropped from both the completed list and the total
  // count here — "hidden" means as if it doesn't exist, consistently on
  // every surface, not just a blanked-out title.
  const visibleChecks = (row.log_rule_checks ?? []).filter((check) => ruleTitles.has(check.rule_id));
  const completedRules = visibleChecks.filter((check) => check.is_completed).map((check) => ruleTitles.get(check.rule_id)!);

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
    total_rules: visibleChecks.length,
    created_at: row.created_at,
    reactions,
    user_reactions: mine,
    ...(batchCount && batchCount > 1 ? { batchCount } : {}),
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
          `id, user_id, log_date, status, photo_url, caption, created_at, batch_id,
           users ( username, display_name, start_date ),
           log_rule_checks ( rule_id, is_completed ),
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
    const visibleRows = rows.filter((row) => !hidden.has(row.user_id));

    // Rule titles never come from the raw `rules` table here — that table's
    // RLS is `using (true)` (needed so owners can read their own rules the
    // normal way), which would hand a secret rule's real title to any viewer.
    // get_visible_rules masks/omits per that owner's own preference instead;
    // one batched call per distinct poster on this page, not per row.
    const distinctUserIds = Array.from(new Set(visibleRows.map((row) => row.user_id)));
    const ruleTitles: RuleTitleMap = new Map();
    await Promise.all(
      distinctUserIds.map(async (userId) => {
        const { data } = await supabase.rpc('get_visible_rules', { target_user_id: userId });
        for (const rule of (data ?? []) as { id: string; title: string }[]) {
          ruleTitles.set(rule.id, rule.title);
        }
      })
    );

    // Rows sharing a batch_id (a multi-day catch-up submitted in one action)
    // collapse into a single post — see catchUpDays. The anchor is the
    // latest-dated row in the group; that's the only one whose photo, rule
    // chips, and reactions surface on the resulting card.
    const groups = new Map<string, FeedRow[]>();
    for (const row of visibleRows) {
      const key = row.batch_id ?? row.id;
      const group = groups.get(key);
      if (group) group.push(row);
      else groups.set(key, [row]);
    }

    const posts = Array.from(groups.values())
      .map((group) => {
        const anchor = group.reduce((latest, row) => (row.log_date > latest.log_date ? row : latest));
        return toFeedPost(anchor, viewerId, ruleTitles, group.length);
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

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
 * One participant's own check-in history, for the "Posts" section of their
 * profile — same row shape and secret-rule masking as the main feed, just
 * scoped to a single `user_id` and with no preview-post padding or
 * community-wide counters (those only make sense for the shared feed).
 */
export async function fetchUserFeedPosts(userId: string, viewerId: string | null): Promise<DbResult<FeedPost[]>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('daily_logs')
      .select(
        `id, user_id, log_date, status, photo_url, caption, created_at, batch_id,
         users ( username, display_name, start_date ),
         log_rule_checks ( rule_id, is_completed ),
         reactions ( reaction_type, reaction_count, sender_id )`
      )
      .eq('user_id', userId)
      .in('status', ['completed', 'shielded'])
      .order('created_at', { ascending: false });

    if (error) return fail(error);

    const rows = (data ?? []) as unknown as FeedRow[];

    const { data: visibleRules } = await supabase.rpc('get_visible_rules', { target_user_id: userId });
    const ruleTitles: RuleTitleMap = new Map();
    for (const rule of (visibleRules ?? []) as { id: string; title: string }[]) {
      ruleTitles.set(rule.id, rule.title);
    }

    const groups = new Map<string, FeedRow[]>();
    for (const row of rows) {
      const key = row.batch_id ?? row.id;
      const group = groups.get(key);
      if (group) group.push(row);
      else groups.set(key, [row]);
    }

    const posts = Array.from(groups.values())
      .map((group) => {
        const anchor = group.reduce((latest, row) => (row.log_date > latest.log_date ? row : latest));
        return toFeedPost(anchor, viewerId, ruleTitles, group.length);
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return ok(posts);
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
