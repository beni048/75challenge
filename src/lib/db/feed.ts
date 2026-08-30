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
import { DbResult, ok, fail } from './types';

// Rows, not posts: a raw batch this size is generously overfetched because a
// multi-day catch-up collapses several rows into one post — see the grouping
// note on fetchFeed below.
const FEED_RAW_FETCH_LIMIT = 60;

/**
 * Whether to pad the feed with curated preview posts.
 *
 * The previews exist so a brand-new community does not look abandoned. The
 * moment *any* real activity exists — not just today's — the feed can stand
 * on its own and the samples are dropped; older real posts are better than
 * samples sitting next to genuine activity, which is what makes the feed
 * feel fake.
 */
export function shouldShowPreviews(realPostCount: number): boolean {
  return realPostCount === 0;
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
  reactions: {
    phrase_id: string;
    sender_id: string;
    updated_at: string;
    users: { username: string; display_name: string } | null;
  }[];
}

/**
 * `rule_id -> title`, only for rules visible to the current viewer. A missing
 * key means that rule is either not completed or, for a secret rule whose
 * owner chose "hidden", deliberately omitted — never fall back to fetching
 * the raw `rules` table to fill the gap.
 */
type RuleTitleMap = Map<string, string>;

function toFeedPost(row: FeedRow, viewerId: string | null, ruleTitles: RuleTitleMap, batchCount?: number): FeedPost {
  // One reaction per (log, sender) is enforced in the database (migration
  // 0006), so this map is really just "index by sender" — but the dedupe
  // stays defensive rather than assuming the constraint always held.
  const reactorsById = new Map<string, { username: string; displayName: string; updatedAt: string }>();
  let myHypePhraseId: string | null = null;

  for (const reaction of row.reactions ?? []) {
    if (reaction.sender_id === viewerId) myHypePhraseId = reaction.phrase_id;

    if (reaction.users && (!reactorsById.has(reaction.sender_id) || reaction.updated_at > reactorsById.get(reaction.sender_id)!.updatedAt)) {
      reactorsById.set(reaction.sender_id, {
        username: reaction.users.username,
        displayName: reaction.users.display_name,
        updatedAt: reaction.updated_at,
      });
    }
  }
  const reactors = Array.from(reactorsById.values())
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(({ username, displayName }) => ({ username, displayName }));

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
    hypeCount: reactors.length,
    myHypePhraseId,
    reactors,
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
  /** Pass as `cursor` to fetchFeed to load the next page; null once exhausted. */
  cursor: string | null;
}

/**
 * Loads one page of the feed for the signed-in viewer.
 *
 * Unfollowed users are filtered out, and while fewer than two people have
 * registered the curated preview posts are appended so the page is not empty
 * (first page only — by definition there is real activity once a second page
 * is being requested).
 *
 * Pagination is keyset, not offset: `cursor` is the `created_at` of the last
 * *raw row* seen on the previous page (returned as `FeedResult.cursor`), not
 * of the last rendered post — offsets drift when new posts arrive between
 * page loads, and a page is naturally sized in rows before grouping anyway
 * (see the batch-collapsing note below).
 */
export async function fetchFeed(
  viewerId: string | null,
  today: string,
  cursor?: string
): Promise<DbResult<FeedResult>> {
  try {
    const supabase = createClient();

    let logsQuery = supabase
      .from('daily_logs')
      .select(
        `id, user_id, log_date, status, photo_url, caption, created_at, batch_id,
         users ( username, display_name, start_date ),
         log_rule_checks ( rule_id, is_completed ),
         reactions ( phrase_id, sender_id, updated_at, users:sender_id ( username, display_name ) )`
      )
      .in('status', ['completed', 'shielded'])
      .order('created_at', { ascending: false })
      .limit(FEED_RAW_FETCH_LIMIT);
    if (cursor) logsQuery = logsQuery.lt('created_at', cursor);

    // Reset announcements are a much rarer event than a check-in, so a small,
    // separate, un-batched fetch merged into the same stream is simpler than
    // folding them into daily_logs' pagination window.
    let eventsQuery = supabase
      .from('challenge_events')
      .select('id, user_id, event_type, created_at, users ( username, display_name )')
      .eq('event_type', 'reset')
      .order('created_at', { ascending: false })
      .limit(20);
    if (cursor) eventsQuery = eventsQuery.lt('created_at', cursor);

    const [logsResult, eventsResult, countResult, unfollowResult] = await Promise.all([
      logsQuery,
      eventsQuery,
      supabase.rpc('participant_count'),
      viewerId
        ? supabase.from('user_unfollows').select('unfollowed_id').eq('follower_id', viewerId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (logsResult.error) return fail(logsResult.error);
    if (eventsResult.error) return fail(eventsResult.error);

    const hidden = new Set(
      (unfollowResult.data ?? []).map((row: { unfollowed_id: string }) => row.unfollowed_id)
    );

    const rows = (logsResult.data ?? []) as unknown as FeedRow[];
    const visibleRows = rows.filter((row) => !hidden.has(row.user_id));

    interface ResetEventRow {
      id: string;
      user_id: string;
      created_at: string;
      users: { username: string; display_name: string } | null;
    }
    const resetPosts: FeedPost[] = ((eventsResult.data ?? []) as unknown as ResetEventRow[])
      .filter((row) => !hidden.has(row.user_id))
      .map((row) => ({
        id: row.id,
        user_id: row.user_id,
        kind: 'reset',
        user: {
          username: row.users?.username ?? 'challenger',
          display_name: row.users?.display_name ?? 'Challenger',
        },
        day_number: 1,
        log_date: '',
        status: 'completed',
        completed_rules: [],
        total_rules: 0,
        created_at: row.created_at,
        hypeCount: 0,
      }));

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

    const posts = [
      ...Array.from(groups.values()).map((group) => {
        const anchor = group.reduce((latest, row) => (row.log_date > latest.log_date ? row : latest));
        return toFeedPost(anchor, viewerId, ruleTitles, group.length);
      }),
      ...resetPosts,
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const totalUsers = typeof countResult.data === 'number' ? countResult.data : 0;
    const activeToday = new Set(
      rows.filter((row) => row.log_date === today).map((row) => row.user_id)
    ).size;

    // Only cursor off of daily_logs rows, not reset events — resets are rare
    // enough that a deep-pagination edge case missing one past this window is
    // an acceptable approximation, not worth a second cursor to track. If the
    // raw batch came back full, assume more may exist; a false-positive "Load
    // More" tap that returns nothing is harmless.
    const nextCursor = rows.length === FEED_RAW_FETCH_LIMIT ? rows[rows.length - 1].created_at : null;
    const showingPreviews = shouldShowPreviews(posts.length);

    return ok({
      // Real activity always comes first; previews only pad the tail.
      posts: showingPreviews ? [...posts, ...STATIC_MOCK_FEED_POSTS] : posts,
      totalUsers,
      activeToday,
      showingPreviews,
      cursor: nextCursor,
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
         reactions ( phrase_id, sender_id, updated_at, users:sender_id ( username, display_name ) )`
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
 * Records (or replaces) this sender's hype on a post — one phrase per person
 * per post, enforced by `unique (log_id, sender_id)` (migration 0006). A
 * second call from the same sender re-rolls their phrase rather than
 * incrementing a tally: a hype is a statement, not a like count.
 *
 * `phraseId` must be a real src/lib/hype-phrases.ts id — the CHECK constraint
 * only bounds its length, so callers are responsible for only ever sending an
 * id from that curated list (never free text — start.md §7).
 */
export async function addReaction(logId: string, senderId: string, phraseId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('reactions').upsert(
      {
        log_id: logId,
        sender_id: senderId,
        phrase_id: phraseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'log_id,sender_id' }
    );

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}
