'use client';

/**
 * Reading and writing a participant's challenge (users + rules + daily_logs).
 *
 * The auth user id IS the challenge id, so there is never a lookup step: if you
 * have a session, you have your challenge's primary key.
 */

import { createClient } from '../supabase/client';
import { calculateTargetEndDate, getEffectiveLogDate } from '../date-utils';
import type { Rule } from '../streak-engine';
import { Challenge, DailyLogRow, RuleRow, UserRow, DbResult, ok, fail } from './types';

/**
 * Turns a display name into a URL-safe username.
 * Collisions are resolved by `createChallenge`, not here.
 */
export function toUsernameSlug(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .normalize('NFD')
    // Strip combining accents so "Jörg" becomes "jorg" rather than "j_rg".
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'challenger';
}

function assemble(user: UserRow, rules: RuleRow[], logs: DailyLogRow[]): Challenge {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    startDate: user.start_date,
    targetEndDate: user.target_end_date,
    shieldsRemaining: user.shields_remaining,
    status: user.status,
    referredById: user.referred_by_id,
    rulesChangedAt: user.rules_changed_at ?? null,
    timezone: user.timezone,
    location: user.location,
    avatarUrl: user.avatar_url,
    secretRulesVisibility: user.secret_rules_visibility,
    rules,
    logs,
  };
}

/** Loads a challenge by auth user id. `data: null` means "no challenge yet". */
export async function fetchChallengeById(userId: string): Promise<DbResult<Challenge | null>> {
  try {
    const supabase = createClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userError) return fail(userError);
    if (!user) return ok(null);

    const [rulesResult, logsResult] = await Promise.all([
      supabase.from('rules').select('*').eq('user_id', userId).order('position'),
      supabase.from('daily_logs').select('*').eq('user_id', userId).order('log_date'),
    ]);

    if (rulesResult.error) return fail(rulesResult.error);
    if (logsResult.error) return fail(logsResult.error);

    return ok(assemble(user, rulesResult.data ?? [], logsResult.data ?? []));
  } catch (error) {
    return fail(error);
  }
}

/**
 * Loads someone else's challenge by username, for their public profile page.
 *
 * Rules come through `get_visible_rules`, never a raw `rules` select — the
 * `rules_select` RLS policy is `using (true)` (any authenticated user can
 * read any row) because that's also how the *owner's own* rules load, so a
 * plain select here would hand a secret rule's real title to any visitor
 * regardless of that owner's `secret_rules_visibility` choice. The RPC masks
 * or omits secret rows server-side instead (see migration 0004).
 */
export async function fetchChallengeByUsername(
  username: string
): Promise<DbResult<Challenge | null>> {
  try {
    const supabase = createClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) return fail(error);
    if (!user) return ok(null);

    const [rulesResult, logsResult] = await Promise.all([
      supabase.rpc('get_visible_rules', { target_user_id: user.id }),
      // RLS hides other people's failed days, so a visitor sees only the
      // completed and shielded ones.
      supabase.from('daily_logs').select('*').eq('user_id', user.id).order('log_date'),
    ]);

    if (rulesResult.error) return fail(rulesResult.error);
    if (logsResult.error) return fail(logsResult.error);

    const rules: RuleRow[] = (rulesResult.data ?? []).map((r: Omit<RuleRow, 'user_id'>) => ({
      ...r,
      user_id: user.id,
    }));

    return ok(assemble(user, rules, logsResult.data ?? []));
  } catch (error) {
    return fail(error);
  }
}

export interface CreateChallengeInput {
  userId: string;
  displayName: string;
  startDate: string;
  rules: Rule[];
  referredByUsername?: string | null;
  /**
   * IANA zone. Optional here because the explicit, editable capture step
   * lands in a later onboarding phase — until then this defaults to the
   * signing-up browser's own detected zone, which is already a correct guess
   * for the common case (someone signing up from where they actually are)
   * rather than leaving every new account on the DB's 'UTC' default.
   */
  timezone?: string;
  location?: string | null;
  /** Already uploaded (via uploadAvatar) before this call — a durable Storage URL, never a blob: preview. */
  avatarUrl?: string | null;
  /**
   * Already normalized via toUsernameSlug (SimpleAuthForm does this). When
   * provided, it's a deliberate choice the user typed or accepted — tried
   * exactly once, and a collision is reported back clearly rather than
   * silently retried under a different name they never chose. Omitted only
   * by callers with no signup form in front of them (handleResumeSetup),
   * which keep the old auto-derive-with-suffix behavior below.
   */
  username?: string;
}

/**
 * Creates the challenge for a freshly signed-up account.
 *
 * A new challenge always starts on Day 1 with one shield and **no logs** —
 * see start.md §2 "Fresh Accounts Start Empty".
 *
 * Idempotent for "this exact user already has a challenge": two independent
 * callers can legitimately race here (OnboardingModal creates the challenge
 * directly after an immediate-session signup, while ChallengeProvider's own
 * auth listener reacts to the same signUp() call and may attempt the same
 * creation from pending-signup data). Without this, the loser hits a `23505`
 * unique-violation on the `id` primary key, the retry loop below mistakes it
 * for a username collision (pointless — a new username doesn't fix a
 * duplicate id), exhausts its attempts, and returns null — which can stomp a
 * correct value the winner already set. Fetching-on-conflict makes both
 * callers converge on the same row instead.
 */
export async function createChallenge(input: CreateChallengeInput): Promise<DbResult<Challenge>> {
  try {
    const supabase = createClient();

    // Resolve the referrer to an id, if the link carried one. A bad ref is
    // ignored rather than blocking the signup.
    let referredById: string | null = null;
    if (input.referredByUsername) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('username', input.referredByUsername)
        .maybeSingle();
      referredById = referrer?.id ?? null;
    }

    // `username` is unique. An explicit, user-chosen username is tried once —
    // a collision there is reported back, not silently renamed. Only the
    // auto-derived fallback (no explicit username supplied) retries with a
    // numeric suffix, since nobody deliberately chose that exact string.
    const base = toUsernameSlug(input.displayName);
    const timezone = input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const explicitUsername = input.username;
    let user: UserRow | null = null;
    let lastError: unknown = null;
    const maxAttempts = explicitUsername ? 1 : 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const username = explicitUsername ?? (attempt === 0 ? base : `${base}_${attempt + 1}`);
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: input.userId,
          username,
          display_name: input.displayName,
          start_date: input.startDate,
          target_end_date: calculateTargetEndDate(input.startDate),
          shields_remaining: 1,
          status: 'active',
          referred_by_id: referredById,
          timezone,
          location: input.location ?? null,
          avatar_url: input.avatarUrl ?? null,
        })
        .select()
        .single();

      if (!error) {
        user = data;
        break;
      }
      lastError = error;

      if (error.code === '23505') {
        // Could be a duplicate `id` (a concurrent caller already created this
        // exact user's challenge) or a duplicate `username` (a genuine
        // collision with someone else). Check which by fetching this user's
        // own row first — if it exists, treat that as success rather than
        // continuing to retry a username that was never the actual problem.
        const existing = await fetchChallengeById(input.userId);
        if (existing.data) {
          return ok(existing.data);
        }
        if (explicitUsername) {
          return fail(new Error('That username is taken. Please choose another.'));
        }
        continue; // genuine username collision — retry with the next suffix
      }
      break; // not a unique-violation at all — no point retrying
    }

    if (!user) return fail(lastError ?? new Error('Could not create challenge'));

    const rules = await replaceRules(input.userId, input.rules);
    if (rules.error) return fail(rules.error);

    return ok(assemble(user, rules.data ?? [], []));
  } catch (error) {
    return fail(error);
  }
}

/**
 * Writes a rule set, preserving history.
 *
 * Rules are diffed rather than replaced. That matters because
 * `log_rule_checks.rule_id` cascades on delete: dropping and re-inserting every
 * rule would destroy the per-rule check marks on every past day, and feed posts
 * would lose the habit chips that show what someone actually did.
 *
 * So: unchanged rules are left alone, edited titles are updated in place (the
 * row id survives, and with it its history), genuinely removed rules are
 * deleted, and new ones inserted.
 */
export async function replaceRules(userId: string, rules: Rule[]): Promise<DbResult<RuleRow[]>> {
  try {
    const supabase = createClient();

    const { data: existing, error: readError } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId);
    if (readError) return fail(readError);

    const existingById = new Map((existing ?? []).map((row) => [row.id, row]));
    const keptIds = new Set<string>();

    const updates: RuleRow[] = [];
    const inserts: Omit<RuleRow, 'id'>[] = [];

    rules.forEach((rule, index) => {
      const match = existingById.get(rule.id);
      if (match) {
        keptIds.add(match.id);
        const changed =
          match.title !== rule.title ||
          match.schedule_type !== rule.schedule_type ||
          match.position !== index ||
          match.is_secret !== (rule.is_secret ?? false) ||
          JSON.stringify(match.custom_days ?? []) !== JSON.stringify(rule.custom_days ?? []);

        if (changed) {
          updates.push({
            ...match,
            title: rule.title,
            schedule_type: rule.schedule_type,
            custom_days: rule.custom_days ?? [],
            position: index,
            is_secret: rule.is_secret ?? false,
          });
        }
      } else {
        // Client-generated ids (`rule-1`, `custom-rule-…`) are not UUIDs, so the
        // database assigns a real one on insert.
        inserts.push({
          user_id: userId,
          title: rule.title,
          schedule_type: rule.schedule_type,
          custom_days: rule.custom_days ?? [],
          position: index,
          is_secret: rule.is_secret ?? false,
        });
      }
    });

    const removedIds = (existing ?? []).map((r) => r.id).filter((id) => !keptIds.has(id));

    if (removedIds.length > 0) {
      const { error } = await supabase.from('rules').delete().in('id', removedIds);
      if (error) return fail(error);
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('rules').upsert(updates);
      if (error) return fail(error);
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('rules').insert(inserts);
      if (error) return fail(error);
    }

    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId)
      .order('position');
    if (error) return fail(error);

    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Marks the one-time post-day-7 rule change as spent.
 * Idempotent — the SQL only writes when the allowance is still unused.
 */
export async function consumeRulesChange(): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('consume_rules_change');
    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Updates the editable parts of a profile. */
export async function updateProfile(
  userId: string,
  fields: {
    displayName?: string;
    avatarUrl?: string | null;
    location?: string | null;
    timezone?: string;
    secretRulesVisibility?: 'placeholder' | 'hidden';
  }
): Promise<DbResult<UserRow>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(fields.displayName ? { display_name: fields.displayName } : {}),
        ...(fields.avatarUrl !== undefined ? { avatar_url: fields.avatarUrl } : {}),
        ...(fields.location !== undefined ? { location: fields.location } : {}),
        ...(fields.timezone ? { timezone: fields.timezone } : {}),
        ...(fields.secretRulesVisibility ? { secret_rules_visibility: fields.secretRulesVisibility } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) return fail(error);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

/** Spends the single Streak Shield on a missed day. */
export async function spendShield(userId: string, missedDate: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();

    const { error: logError } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: userId, log_date: missedDate, status: 'shielded' },
        { onConflict: 'user_id,log_date' }
      );
    if (logError) return fail(logError);

    const { error } = await supabase
      .from('users')
      .update({ shields_remaining: 0, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Restarts the challenge from Day 1 today: clears every logged day and returns
 * a fresh shield. Destructive and irreversible — always confirm first.
 *
 * `timezone` must be this same user's own stored timezone (`challenge.timezone`
 * at the call site) — "today" for a reset is the owner's today, same rule as
 * everywhere else in the app.
 */
export async function restartChallenge(userId: string, timezone: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const startDate = getEffectiveLogDate(timezone);

    const { error: logsError } = await supabase.from('daily_logs').delete().eq('user_id', userId);
    if (logsError) return fail(logsError);

    const { error } = await supabase
      .from('users')
      .update({
        start_date: startDate,
        target_end_date: calculateTargetEndDate(startDate),
        shields_remaining: 1,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) return fail(error);
    return ok(true);
  } catch (error) {
    return fail(error);
  }
}
