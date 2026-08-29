'use client';

/**
 * Daily check-in persistence.
 *
 * One row per (user, day). Re-submitting a day updates it in place rather than
 * stacking duplicates, so a user can correct a check-in.
 */

import { createClient } from '../supabase/client';
import { DailyLogRow, LogStatus, DbResult, ok, fail } from './types';

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
