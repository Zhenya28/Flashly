/**
 * SM-2 to FSRS Migration Utility
 *
 * Converts SM-2 review data to FSRS card state.
 * This allows existing user data to be preserved when migrating algorithms.
 */

import { FSRSCard, CardState, INITIAL_CARD } from './fsrs';

export interface SM2Data {
  box: number;
  interval: number;
  ease_factor: number;
  next_review_at: string | null;
  last_studied_at: string | null;
}

/**
 * Convert SM-2 data to FSRS card state
 *
 * Mapping logic:
 * - SM-2 box 0 -> FSRS state 'new' or 'learning'
 * - SM-2 box 1-2 with short interval -> FSRS state 'learning'
 * - SM-2 box 3+ -> FSRS state 'review'
 *
 * - SM-2 ease_factor (1.3-3.0+) maps inversely to FSRS difficulty (1-10)
 *   - ease_factor 1.3 (hardest) -> difficulty 10
 *   - ease_factor 2.5 (default) -> difficulty 5
 *   - ease_factor 3.0+ (easiest) -> difficulty 1
 *
 * - SM-2 interval approximates FSRS stability
 */
export function migrateSM2toFSRS(sm2: SM2Data | null): FSRSCard {
  // No data or new card
  if (!sm2 || (sm2.box === 0 && sm2.interval === 0)) {
    return { ...INITIAL_CARD, dueDate: new Date() };
  }

  // Determine card state
  let state: CardState;
  if (sm2.box === 0) {
    state = 'learning';
  } else if (sm2.box <= 2 && sm2.interval <= 1) {
    state = 'learning';
  } else {
    state = 'review';
  }

  // Convert ease_factor to difficulty
  // SM-2: 1.3 (hardest) to ~3.0 (easiest), default 2.5
  // FSRS: 1 (easiest) to 10 (hardest), default ~5
  // Formula: difficulty = 11 - (ease_factor - 1.3) * 6
  const easeFactor = Math.max(1.3, Math.min(3.0, sm2.ease_factor));
  const difficulty = Math.max(1, Math.min(10, 11 - (easeFactor - 1.3) * (9 / 1.7)));

  // Estimate stability from interval
  // In FSRS, stability represents the time (days) at which retrievability drops to 90%
  // SM-2 interval is a rough approximation
  const stability = Math.max(0.5, sm2.interval);

  // Parse dates
  const dueDate = sm2.next_review_at
    ? new Date(sm2.next_review_at)
    : new Date();
  const lastReview = sm2.last_studied_at
    ? new Date(sm2.last_studied_at)
    : null;

  // Reps is approximately the box number
  const reps = sm2.box;

  // Lapses unknown from SM-2, start at 0
  // Could estimate based on box resets but we don't have that history
  const lapses = 0;

  return {
    stability,
    difficulty,
    dueDate,
    lastReview,
    reps,
    lapses,
    state,
  };
}

/**
 * Convert FSRS rating (1-4) to SM-2 grade (0-5) for backwards compatibility
 */
export function fsrsRatingToSM2Grade(rating: 1 | 2 | 3 | 4): number {
  const mapping: Record<1 | 2 | 3 | 4, number> = {
    1: 0, // Again -> 0 (Fail)
    2: 3, // Hard -> 3
    3: 4, // Good -> 4
    4: 5, // Easy -> 5
  };
  return mapping[rating];
}

/**
 * Convert SM-2 grade (0-5) to FSRS rating (1-4)
 */
export function sm2GradeToFSRSRating(grade: number): 1 | 2 | 3 | 4 {
  if (grade <= 2) return 1; // Again
  if (grade === 3) return 2; // Hard
  if (grade === 4) return 3; // Good
  return 4; // Easy
}
