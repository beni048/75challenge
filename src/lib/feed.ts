/**
 * Feed Query Logic with Cold-Start Previews (< 2 active users)
 * and strict Positive-Only filters (completed / shielded).
 */

export interface FeedPost {
  id: string;
  user_id: string;
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
  reactions: {
    fire: number;
    beast: number;
    launch: number;
    hype: number;
  };
  user_reactions?: string[]; // types clicked by current user
  is_mock?: boolean;
}

/**
 * Curated static mock posts for cold-start (< 2 registered users).
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
    photo_url: null,
    caption: 'Outdoor run in the morning drizzle done. 4L water checked off before dinner. 61 days to go!',
    completed_rules: [
      '2x 45-min workouts (1 outdoors)',
      'Drink 4L water',
      'Read 10 pages non-fiction',
      'Clean diet (no cheat meals)',
      'No alcohol',
    ],
    total_rules: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    reactions: { fire: 8, beast: 14, launch: 5, hype: 19 },
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
    photo_url: null,
    caption: 'Past the 4-week mark! Mindset shift is getting real. 10 pages of Atomic Habits completed.',
    completed_rules: [
      '2x 45-min workouts',
      'Drink 4L water',
      'Read 10 pages',
      'Zero alcohol',
    ],
    total_rules: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    reactions: { fire: 24, beast: 9, launch: 12, hype: 31 },
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
    photo_url: null,
    caption: 'Surviving week 1! Used my shield yesterday due to travel delays, back on track with a vengeance today.',
    completed_rules: [
      'Workout: Heavy lifting + Rucking',
      'Read 10 pages',
      'Hydration 4L',
    ],
    total_rules: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    reactions: { fire: 15, beast: 18, launch: 7, hype: 22 },
    is_mock: true,
  },
];
