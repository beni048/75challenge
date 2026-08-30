'use client';

/**
 * Daily check-in persistence.
 *
 * One row per (user, day). Re-submitting a day updates it in place rather than
 * stacking duplicates, so a user can correct a check-in.
 */

import { createClient } from '../supabase/client';
import { DailyLogRow, LogStatus, DbResult, ok, fail } from './types';
import { Rule, getRequiredRulesForDate } from '../streak-engine';

export interface SaveLogInput {
  userId: string;
  logDate: string;
  status: LogStatus;
  photoUrl?: string | null;
  caption?: string | null;
  /** Which of the user's rules were ticked, by rule id. */
  ruleChecks: { ruleId: string; isCompleted: boolean }[];
}

/**
 * Writes (or rewrites) one day's log together with its per-rule check marks.
 *
 * The checks are deleted and re-inserted rather than diffed — a handful of rows
 * per day makes that far simpler than reconciling, with no practical cost.
 */
export async function saveDailyLog(input: SaveLogInput): Promise<DbResult<DailyLogRow>> {
  try {
    const supabase = createClient();

    const { data: log, error } = await supabase
      .from('daily_logs')
      .upsert(
        {
          user_id: input.userId,
          log_date: input.logDate,
          status: input.status,
          photo_url: input.photoUrl ?? null,
          caption: input.caption ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,log_date' }
      )
      .select()
      .single();

    if (error) return fail(error);

    const { error: clearError } = await supabase
      .from('log_rule_checks')
      .delete()
      .eq('log_id', log.id);
    if (clearError) return fail(clearError);

    if (input.ruleChecks.length > 0) {
      const { error: checksError } = await supabase.from('log_rule_checks').insert(
        input.ruleChecks.map((check) => ({
          log_id: log.id,
          rule_id: check.ruleId,
          is_completed: check.isCompleted,
        }))
      );
      if (checksError) return fail(checksError);
    }

    return ok(log);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Marks one or more past, pending days as done in a single action.
 *
 * A deliberate simplification: catching up doesn't ask which specific rules
 * were actually done on a bygone day — every rule scheduled for that date
 * (by *today's* rule set; rules have no history/valid-from tracking) is
 * marked completed. There is no photo or caption on a catch-up row — nothing
 * was captured in the moment, so nothing is invented for it now.
 *
 * More than one date in a single call shares one `batch_id`, so the feed
 * collapses them into a single aggregated post rather than one per day.
 */
export async function catchUpDays(userId: string, dates: string[], rules: Rule[]): Promise<DbResult<true>> {
  if (dates.length === 0) return ok(true);

  try {
    const supabase = createClient();
    const batchId = dates.length > 1 ? crypto.randomUUID() : null;

    for (const date of dates) {
      const { data: log, error } = await supabase
        .from('daily_logs')
        .upsert(
          {
            user_id: userId,
            log_date: date,
            status: 'completed',
            photo_url: null,
            caption: null,
            batch_id: batchId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,log_date' }
        )
        .select()
        .single();
      if (error) return fail(error);

      const { error: clearError } = await supabase.from('log_rule_checks').delete().eq('log_id', log.id);
      if (clearError) return fail(clearError);

      const scheduled = getRequiredRulesForDate(rules, date);
      if (scheduled.length > 0) {
        const { error: checksError } = await supabase
          .from('log_rule_checks')
          .insert(scheduled.map((rule) => ({ log_id: log.id, rule_id: rule.id, is_completed: true })));
        if (checksError) return fail(checksError);
      }
    }

    return ok(true);
  } catch (error) {
    return fail(error);
  }
}

/** Loads the per-rule check marks for one log, to pre-fill an edited day. */
export async function fetchRuleChecks(
  logId: string
): Promise<DbResult<{ rule_id: string; is_completed: boolean }[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('log_rule_checks')
      .select('rule_id, is_completed')
      .eq('log_id', logId);

    if (error) return fail(error);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}
