/**
 * FSRS-4.5 (Free Spaced Repetition Scheduler)
 * Based on open-anki/fsrs implementation (MIT License)
 *
 * FSRS is a modern spaced repetition algorithm that outperforms SM-2
 * by using a more sophisticated model of human memory.
 */

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface FSRSCard {
  stability: number;      // S - Memory stability in days
  difficulty: number;     // D - Difficulty (1-10)
  dueDate: Date;
  lastReview: Date | null;
  reps: number;           // Number of reviews
  lapses: number;         // Number of times card was forgotten
  state: CardState;
}

export interface FSRSParameters {
  w: number[];              // 17 optimized parameters
  requestRetention: number; // Target retention rate (0.9 = 90%)
  maximumInterval: number;  // Maximum interval in days
}

// FSRS-4.5 default parameters (optimized on large datasets)
// See: https://github.com/open-spaced-repetition/fsrs4anki
export const DEFAULT_PARAMETERS: FSRSParameters = {
  w: [
    0.4, 0.6, 2.4, 5.8,     // w[0-3]: Initial stability for each rating (Again, Hard, Good, Easy)
    4.93,                    // w[4]: Initial difficulty
    0.94, 0.86, 0.01,        // w[5-7]: Difficulty adjustments
    1.49, 0.14, 0.94,        // w[8-10]: Stability adjustments for recall
    2.18, 0.05, 0.34, 1.26,  // w[11-14]: Forgetting formula parameters
    0.29, 2.61               // w[15-16]: Hard penalty, Easy bonus
  ],
  requestRetention: 0.9,     // Target 90% retention rate
  maximumInterval: 36500,    // 100 years max
};

export const INITIAL_CARD: FSRSCard = {
  stability: 0,
  difficulty: 0,
  dueDate: new Date(),
  lastReview: null,
  reps: 0,
  lapses: 0,
  state: 'new',
};

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

export class FSRS {
  private params: FSRSParameters;

  constructor(params: Partial<FSRSParameters> = {}) {
    this.params = { ...DEFAULT_PARAMETERS, ...params };
  }

  /**
   * Calculate the next card state after a review
   */
  review(card: FSRSCard, rating: Rating, now: Date = new Date()): FSRSCard {
    const { state } = card;

    switch (state) {
      case 'new':
        return this.reviewNew(card, rating, now);
      case 'learning':
      case 'relearning':
        return this.reviewLearning(card, rating, now);
      case 'review':
        return this.reviewReview(card, rating, now);
      default:
        return this.reviewNew(card, rating, now);
    }
  }

  /**
   * Review a new card
   */
  private reviewNew(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    const { w } = this.params;

    // Initial stability based on first rating
    const stability = w[rating - 1];
    const difficulty = this.initDifficulty(rating);

    if (rating === 1) {
      // Again -> Learning state with 1 minute delay
      return {
        stability,
        difficulty,
        dueDate: this.addMinutes(now, 1),
        lastReview: now,
        reps: 1,
        lapses: 1,
        state: 'learning',
      };
    } else if (rating === 2) {
      // Hard -> Learning state with 5 minute delay
      return {
        stability,
        difficulty,
        dueDate: this.addMinutes(now, 5),
        lastReview: now,
        reps: 1,
        lapses: 0,
        state: 'learning',
      };
    } else {
      // Good/Easy -> Review state
      const interval = this.nextInterval(stability);
      return {
        stability,
        difficulty,
        dueDate: this.addDays(now, interval),
        lastReview: now,
        reps: 1,
        lapses: 0,
        state: 'review',
      };
    }
  }

  /**
   * Review a card in learning/relearning state
   */
  private reviewLearning(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    if (rating === 1) {
      // Again -> Stay in learning, restart
      return {
        ...card,
        dueDate: this.addMinutes(now, 1),
        lastReview: now,
        reps: card.reps + 1,
        lapses: card.lapses + 1,
      };
    } else if (rating === 2) {
      // Hard -> Stay in learning with longer delay
      return {
        ...card,
        dueDate: this.addMinutes(now, 5),
        lastReview: now,
        reps: card.reps + 1,
      };
    } else {
      // Good/Easy -> Graduate to review
      const interval = this.nextInterval(card.stability);
      return {
        ...card,
        dueDate: this.addDays(now, interval),
        lastReview: now,
        reps: card.reps + 1,
        state: 'review',
      };
    }
  }

  /**
   * Review a card in review state
   */
  private reviewReview(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    // Calculate elapsed time since last review
    const elapsed = card.lastReview
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Calculate current retrievability
    const retrievability = this.forgettingCurve(elapsed, card.stability);

    // Update difficulty and stability
    const newDifficulty = this.nextDifficulty(card.difficulty, rating);
    const newStability = this.nextStability(
      card.stability,
      card.difficulty,
      retrievability,
      rating
    );

    if (rating === 1) {
      // Again -> Relearning state
      return {
        stability: newStability,
        difficulty: newDifficulty,
        dueDate: this.addMinutes(now, 1),
        lastReview: now,
        reps: card.reps + 1,
        lapses: card.lapses + 1,
        state: 'relearning',
      };
    } else {
      // Hard/Good/Easy -> Stay in review
      const interval = this.nextInterval(newStability);
      return {
        stability: newStability,
        difficulty: newDifficulty,
        dueDate: this.addDays(now, interval),
        lastReview: now,
        reps: card.reps + 1,
        lapses: card.lapses,
        state: 'review',
      };
    }
  }

  /**
   * Calculate initial difficulty based on first rating
   */
  private initDifficulty(rating: Rating): number {
    const { w } = this.params;
    const d0 = w[4] - w[5] * (rating - 3);
    return this.clampDifficulty(d0);
  }

  /**
   * Calculate next difficulty after a review
   */
  private nextDifficulty(d: number, rating: Rating): number {
    const { w } = this.params;
    const delta = w[6] * (rating - 3);
    const meanReversion = w[7] * (w[4] - d);
    return this.clampDifficulty(d - delta + meanReversion);
  }

  /**
   * Calculate next stability after a review (FSRS-4.5 formula)
   */
  private nextStability(
    s: number,
    d: number,
    r: number,
    rating: Rating
  ): number {
    const { w } = this.params;

    if (rating === 1) {
      // Forgetting formula - stability decreases after lapse
      // S'(D,S,R) = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * e^(w[14]*(1-R))
      const newS =
        w[11] *
        Math.pow(d, -w[12]) *
        (Math.pow(s + 1, w[13]) - 1) *
        Math.exp(w[14] * (1 - r));
      return Math.max(0.1, newS); // Minimum stability of 0.1 days
    } else {
      // Recall formula - stability increases after successful recall
      // S'(D,S,R,G) = S * (1 + e^w[8] * (11-D) * S^(-w[9]) * (e^(w[10]*(1-R)) - 1) * HardPenalty * EasyBonus)
      const hardPenalty = rating === 2 ? w[15] : 1;
      const easyBonus = rating === 4 ? w[16] : 1;

      const newS =
        s *
        (1 +
          Math.exp(w[8]) *
            (11 - d) *
            Math.pow(s, -w[9]) *
            (Math.exp(w[10] * (1 - r)) - 1) *
            hardPenalty *
            easyBonus);

      // Stability should never decrease on successful recall
      return Math.max(s, newS);
    }
  }

  /**
   * Calculate the interval in days for a given stability
   * Formula: I(R,S) = S * ln(R) / ln(0.9)
   * Where R = requestRetention (target retention rate)
   */
  private nextInterval(stability: number): number {
    const { requestRetention, maximumInterval } = this.params;
    
    // When requestRetention = 0.9 (90%), interval equals stability
    // For higher retention targets, intervals are shorter
    // For lower retention targets, intervals are longer
    const interval = (stability * Math.log(requestRetention)) / Math.log(0.9);
    
    // Clamp to valid range [1, maximumInterval]
    return Math.min(Math.max(1, Math.round(interval)), maximumInterval);
  }

  /**
   * Forgetting curve - calculate retrievability given elapsed time and stability
   */
  private forgettingCurve(elapsed: number, stability: number): number {
    if (stability === 0 || elapsed < 0) return 0;
    return Math.exp((Math.log(0.9) * elapsed) / stability);
  }

  /**
   * Clamp difficulty to valid range (1-10)
   */
  private clampDifficulty(d: number): number {
    return Math.max(1, Math.min(10, d));
  }

  /**
   * Add minutes to a date
   */
  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Get predicted intervals for all ratings (for UI display)
   */
  getIntervals(card: FSRSCard, now: Date = new Date()): Record<Rating, string> {
    const intervals: Record<Rating, string> = {} as Record<Rating, string>;

    for (const rating of [1, 2, 3, 4] as Rating[]) {
      const nextCard = this.review(card, rating, now);
      const diff = nextCard.dueDate.getTime() - now.getTime();
      intervals[rating] = this.formatInterval(diff);
    }

    return intervals;
  }

  /**
   * Format interval in milliseconds to human-readable string
   */
  formatInterval(ms: number): string {
    const minutes = Math.round(ms / (1000 * 60));
    const hours = Math.round(ms / (1000 * 60 * 60));
    const days = Math.round(ms / (1000 * 60 * 60 * 24));
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    if (days < 30) return `${weeks}w`;
    if (days < 365) return `${months}mo`;
    return `${years}y`;
  }

  /**
   * Get current retrievability of a card
   */
  getRetrievability(card: FSRSCard, now: Date = new Date()): number {
    if (card.state === 'new' || !card.lastReview) return 0;

    const elapsed =
      (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);
    return this.forgettingCurve(elapsed, card.stability);
  }

  /**
   * Check if a card is due for review
   */
  isDue(card: FSRSCard, now: Date = new Date()): boolean {
    return card.dueDate <= now;
  }
}

// Default FSRS instance
export const fsrs = new FSRS();
