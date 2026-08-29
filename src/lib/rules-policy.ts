/**
 * How many habits a challenge may have.
 *
 * A floor of 3 pushes people past a single token habit and towards a set that
 * covers more than one area of life; a ceiling of 11 stops the list becoming a
 * wish list nobody can complete every day for 75 days.
 */
export const MIN_RULES = 3;
export const MAX_RULES = 11;

export function hasEnoughRules(count: number): boolean {
  return count >= MIN_RULES;
}

export function canAddRule(count: number): boolean {
  return count < MAX_RULES;
}
