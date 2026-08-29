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

/** Loads someone else's challenge by username, for their public profile page. */
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
      supabase.from('rules').select('*').eq('user_id', user.id).order('position'),
      // RLS hides other people's failed days, so a visitor sees only the
      // completed and shielded ones.
      supabase.from('daily_logs').select('*').eq('user_id', user.id).order('log_date'),
    ]);

    if (rulesResult.error) return fail(rulesResult.error);
    if (logsResult.error) return fail(logsResult.error);

    return ok(assemble(user, rulesResult.data ?? [], logsResult.data ?? []));
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
}

/**
 * Creates the challenge for a freshly signed-up account.
 *
 * A new challenge always starts on Day 1 with one shield and **no logs** —
 * see start.md §2 "Fresh Accounts Start Empty".
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

    // `username` is unique. Try the plain slug first, then suffix it until the
    // insert stops colliding (Postgres unique violation is code 23505).
    const base = toUsernameSlug(input.displayName);
    let user: UserRow | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const username = attempt === 0 ? base : `${base}_${attempt + 1}`;
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
        })
        .select()
        .single();

      if (!error) {
        user = data;
        break;
      }
      lastError = error;
      // Only a username collision is worth retrying.
      if (error.code !== '23505') break;
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
 * Replaces a user's rule set wholesale.
 *
 * Rules are deleted and re-inserted rather than diffed: the set is tiny, and
 * `log_rule_checks` cascades, so historical check marks for a removed rule
 * disappear with it — which is the behaviour we want.
 */
export async function replaceRules(userId: string, rules: Rule[]): Promise<DbResult<RuleRow[]>> {
  try {
    const supabase = createClient();

    const { error: deleteError } = await supabase.from('rules').delete().eq('user_id', userId);
    if (deleteError) return fail(deleteError);

    if (rules.length === 0) return ok([]);

    const { data, error } = await supabase
      .from('rules')
      .insert(
        rules.map((rule, index) => ({
          user_id: userId,
          title: rule.title,
          schedule_type: rule.schedule_type,
          custom_days: rule.custom_days ?? [],
          position: index,
        }))
      )
      .select()
      .order('position');

    if (error) return fail(error);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}

/** Updates the editable parts of a profile. */
export async function updateProfile(
  userId: string,
  fields: { displayName?: string }
): Promise<DbResult<UserRow>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(fields.displayName ? { display_name: fields.displayName } : {}),
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
 */
export async function restartChallenge(userId: string): Promise<DbResult<true>> {
  try {
    const supabase = createClient();
    const startDate = getEffectiveLogDate();

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
