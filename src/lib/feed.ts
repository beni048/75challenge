/**
 * Feed data model and cold-start preview posts.
 *
 * Live posts come from Supabase and carry user-authored text, which is shown
 * as written. The curated preview posts below are product copy, so they carry
 * `*_i18n` variants and are rendered in the viewer's language — see
 * `localizedCaption` / `localizedRules`.
 */

import type { Locale } from './i18n';

export interface FeedPost {
  id: string;
  user_id: string;
  /**
   * 'reset' is a plain announcement (no photo, rule chips, or hype — a
   * reaction always references a daily_logs row, and a reset event isn't
   * one). Absent/'checkin' is the normal check-in card this type was
   * originally shaped around; every other field below is meaningless for a
   * 'reset' post beyond user/created_at.
   */
  kind?: 'checkin' | 'reset';
  user: {
    username: string;
    display_name: string;
  };
  day_number: number;
  log_date: string;
  status: 'completed' | 'shielded';
  photo_url?: string | null;
  caption?: string | null;
  completed_rules: string[];
  total_rules: number;
  created_at: string;
  /** Everyone who has hyped this post — the claimer plus everyone agreeing. */
  hypeCount: number;
  /**
   * The single phrase claimed for this post by whoever hyped it first, and who
   * that was. Null until somebody hypes it. Everyone after agrees with this
   * sentence rather than adding their own (see migration 0008).
   */
  hypePhraseId?: string | null;
  hypeClaimedBy?: { username: string; displayName: string } | null;
  /** True when the viewer has already hyped — so the button reads "agreed". */
  viewerHasHyped?: boolean;
  /** Everyone who agreed, most recent first, excluding the claimer. */
  agreedBy?: { username: string; displayName: string }[];
  is_mock?: boolean;
  /** Preview-post copy, per locale. Absent on real user posts. */
  caption_i18n?: Record<Locale, string>;
  completed_rules_i18n?: Record<Locale, string[]>;
  /**
   * Set when this post aggregates a multi-day catch-up submitted in one
   * action (see catchUpDays / daily_logs.batch_id) — the count of days
   * collapsed into it. FeedCard shows a translated "Caught up on N days"
   * line instead of `caption` when this is present; the photo and rule
   * chips still come from the single anchor (latest-date) row.
   */
  batchCount?: number;
}

export function localizedCaption(post: FeedPost, locale: Locale): string | null | undefined {
  return post.caption_i18n?.[locale] ?? post.caption;
}

export function localizedRules(post: FeedPost, locale: Locale): string[] {
  return post.completed_rules_i18n?.[locale] ?? post.completed_rules;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - 1000 * 60 * minutes).toISOString();

/**
 * Curated static preview posts, shown on the public landing page and injected
 * into the feed during cold start (< 2 registered users).
 */
export const STATIC_MOCK_FEED_POSTS: FeedPost[] = [
  {
    id: 'mock-post-1',
    user_id: 'mock-user-1',
    user: {
      username: 'alex_iron',
      display_name: 'Alex Rivera',
    },
    day_number: 14,
    log_date: '2026-09-14',
    status: 'completed',
    photo_url: '/samples/feed-sunrise-run.webp',
    caption:
      'Outdoor run in the morning drizzle done. 4L water checked off before dinner. 61 days to go!',
    caption_i18n: {
      en: 'Outdoor run in the morning drizzle done. 4L water checked off before dinner. 61 days to go!',
      de: 'Lauf im Morgennieselregen erledigt. 4 Liter Wasser vor dem Abendessen abgehakt. Noch 61 Tage!',
    },
    completed_rules: [
      '2x 45-min workouts (1 outdoors)',
      'Drink 4L water',
      'Read 10 pages non-fiction',
      'Clean diet (no cheat meals)',
      'No alcohol',
    ],
    completed_rules_i18n: {
      en: [
        '2x 45-min workouts (1 outdoors)',
        'Drink 4L water',
        'Read 10 pages non-fiction',
        'Clean diet (no cheat meals)',
        'No alcohol',
      ],
      de: [
        '2x 45 Min Training (1x draussen)',
        '4 Liter Wasser trinken',
        '10 Seiten Sachbuch lesen',
        'Saubere Ernährung (keine Cheat Meals)',
        'Kein Alkohol',
      ],
    },
    total_rules: 5,
    created_at: minutesAgo(45),
    hypeCount: 46,
    is_mock: true,
  },
  {
    id: 'mock-post-2',
    user_id: 'mock-user-2',
    user: {
      username: 'sam_hustle',
      display_name: 'Samantha Vance',
    },
    day_number: 28,
    log_date: '2026-09-28',
    status: 'completed',
    photo_url: '/samples/feed-reading.webp',
    caption:
      'Past the 4-week mark! Mindset shift is getting real. 10 pages of Atomic Habits completed.',
    caption_i18n: {
      en: 'Past the 4-week mark! Mindset shift is getting real. 10 pages of Atomic Habits completed.',
      de: 'Die 4-Wochen-Marke ist geknackt! Der Kopf zieht langsam mit. 10 Seiten Atomic Habits gelesen.',
    },
    completed_rules: ['2x 45-min workouts', 'Drink 4L water', 'Read 10 pages', 'Zero alcohol'],
    completed_rules_i18n: {
      en: ['2x 45-min workouts', 'Drink 4L water', 'Read 10 pages', 'Zero alcohol'],
      de: ['2x 45 Min Training', '4 Liter Wasser trinken', '10 Seiten lesen', 'Kein Alkohol'],
    },
    total_rules: 4,
    created_at: minutesAgo(180),
    hypeCount: 76,
    is_mock: true,
  },
  {
    id: 'mock-post-3',
    user_id: 'mock-user-3',
    user: {
      username: 'david_grit',
      display_name: 'David Chen',
    },
    day_number: 7,
    log_date: '2026-09-07',
    status: 'shielded',
    photo_url: '/samples/feed-gym-session.webp',
    caption:
      'Surviving week 1! Used my shield yesterday due to travel delays, back on track with a vengeance today.',
    caption_i18n: {
      en: 'Surviving week 1! Used my shield yesterday due to travel delays, back on track with a vengeance today.',
      de: 'Woche 1 überstanden! Gestern wegen Reiseverspätung mein Schild eingesetzt – heute wieder voll dabei.',
    },
    completed_rules: ['Workout: Heavy lifting + Rucking', 'Read 10 pages', 'Hydration 4L'],
    completed_rules_i18n: {
      en: ['Workout: Heavy lifting + Rucking', 'Read 10 pages', 'Hydration 4L'],
      de: ['Training: Schweres Heben + Rucking', '10 Seiten lesen', '4 Liter Flüssigkeit'],
    },
    total_rules: 3,
    created_at: minutesAgo(360),
    hypeCount: 62,
    is_mock: true,
  },
  {
    id: 'mock-post-4',
    user_id: 'mock-user-4',
    user: {
      username: 'lena_steady',
      display_name: 'Lena Brunner',
    },
    day_number: 41,
    log_date: '2026-10-11',
    status: 'completed',
    photo_url: '/samples/feed-hydration.webp',
    caption:
      'Day 41 and the 4 litres are finally a habit instead of a chore. Evening walk done in the rain.',
    caption_i18n: {
      en: 'Day 41 and the 4 litres are finally a habit instead of a chore. Evening walk done in the rain.',
      de: 'Tag 41 – die 4 Liter sind endlich Gewohnheit statt Pflicht. Abendspaziergang im Regen erledigt.',
    },
    completed_rules: ['Drink 4L water', 'Evening walk 45 min', 'Read 10 pages', 'No alcohol'],
    completed_rules_i18n: {
      en: ['Drink 4L water', 'Evening walk 45 min', 'Read 10 pages', 'No alcohol'],
      de: ['4 Liter Wasser trinken', '45 Min Abendspaziergang', '10 Seiten lesen', 'Kein Alkohol'],
    },
    total_rules: 4,
    created_at: minutesAgo(520),
    hypeCount: 43,
    is_mock: true,
  },
];
