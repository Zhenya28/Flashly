// FSRS-4.5 (Free Spaced Repetition Scheduler)
// Based on open-spaced-repetition/fsrs4anki (MIT License)

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface FSRSCard {
  stability: number;
  difficulty: number;
  dueDate: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  state: CardState;
}

export interface FSRSParameters {
  w: number[];
  requestRetention: number;
  maximumInterval: number;
}

export const DEFAULT_PARAMETERS: FSRSParameters = {
  w: [
    0.4, 0.6, 2.4, 5.8,      // Initial stability per rating
    4.93,                       // Initial difficulty
    0.94, 0.86, 0.01,          // Difficulty adjustments
    1.49, 0.14, 0.94,          // Stability adjustments (recall)
    2.18, 0.05, 0.34, 1.26,   // Forgetting formula
    0.29, 2.61                  // Hard penalty, Easy bonus
  ],
  requestRetention: 0.9,
  maximumInterval: 36500,
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

  review(card: FSRSCard, rating: Rating, now: Date = new Date()): FSRSCard {
    switch (card.state) {
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

  private reviewNew(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    const { w } = this.params;
    const stability = w[rating - 1];
    const difficulty = this.initDifficulty(rating);

    if (rating === 1) {
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

  private reviewLearning(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    if (rating === 1) {
      return {
        ...card,
        dueDate: this.addMinutes(now, 1),
        lastReview: now,
        reps: card.reps + 1,
        lapses: card.lapses + 1,
      };
    } else if (rating === 2) {
      return {
        ...card,
        dueDate: this.addMinutes(now, 5),
        lastReview: now,
        reps: card.reps + 1,
      };
    } else {
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

  private reviewReview(card: FSRSCard, rating: Rating, now: Date): FSRSCard {
    const elapsed = card.lastReview
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const retrievability = this.forgettingCurve(elapsed, card.stability);
    const newDifficulty = this.nextDifficulty(card.difficulty, rating);
    const newStability = this.nextStability(
      card.stability,
      card.difficulty,
      retrievability,
      rating
    );

    if (rating === 1) {
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

  private initDifficulty(rating: Rating): number {
    const { w } = this.params;
    return this.clampDifficulty(w[4] - w[5] * (rating - 3));
  }

  private nextDifficulty(d: number, rating: Rating): number {
    const { w } = this.params;
    const delta = w[6] * (rating - 3);
    const meanReversion = w[7] * (w[4] - d);
    return this.clampDifficulty(d - delta + meanReversion);
  }

  // S'(D,S,R) for lapse; S'(D,S,R,G) for recall
  private nextStability(s: number, d: number, r: number, rating: Rating): number {
    const { w } = this.params;

    if (rating === 1) {
      const newS =
        w[11] *
        Math.pow(d, -w[12]) *
        (Math.pow(s + 1, w[13]) - 1) *
        Math.exp(w[14] * (1 - r));
      return Math.max(0.1, newS);
    } else {
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

      return Math.max(s, newS);
    }
  }

  // I(R,S) = S * ln(R) / ln(0.9)
  private nextInterval(stability: number): number {
    const { requestRetention, maximumInterval } = this.params;
    const interval = (stability * Math.log(requestRetention)) / Math.log(0.9);
    return Math.min(Math.max(1, Math.round(interval)), maximumInterval);
  }

  private forgettingCurve(elapsed: number, stability: number): number {
    if (stability === 0 || elapsed < 0) return 0;
    return Math.exp((Math.log(0.9) * elapsed) / stability);
  }

  private clampDifficulty(d: number): number {
    return Math.max(1, Math.min(10, d));
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  getIntervals(card: FSRSCard, now: Date = new Date()): Record<Rating, string> {
    const intervals: Record<Rating, string> = {} as Record<Rating, string>;

    for (const rating of [1, 2, 3, 4] as Rating[]) {
      const nextCard = this.review(card, rating, now);
      const diff = nextCard.dueDate.getTime() - now.getTime();
      intervals[rating] = this.formatInterval(diff);
    }

    return intervals;
  }

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

  getRetrievability(card: FSRSCard, now: Date = new Date()): number {
    if (card.state === 'new' || !card.lastReview) return 0;

    const elapsed =
      (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);
    return this.forgettingCurve(elapsed, card.stability);
  }

  isDue(card: FSRSCard, now: Date = new Date()): boolean {
    return card.dueDate <= now;
  }
}

export const fsrs = new FSRS();
