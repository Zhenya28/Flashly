// Mastery calculation using FSRS retrievability: R = e^((ln(0.9) * elapsed) / stability)

import { fsrs, FSRSCard, CardState } from './fsrs';

export interface CardMastery {
  mastery: number;       // 0-100%
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  intervalDays: number;  // scheduled interval in days (0 for learning cards)
  isOverdue: boolean;
  lastReview: Date | null;
  nextReview: Date;
}

export interface CollectionMastery {
  averageMastery: number;   // 0-100%
  masteredCount: number;    // mastery >= 90%
  learningCount: number;    // mastery 1-89%
  newCount: number;         // mastery === 0 (never studied)
  totalCards: number;
}

export function calculateCardMastery(card: FSRSCard, now: Date = new Date()): number {
  if (card.state === 'new' || !card.lastReview) return 0;
  const retrievability = fsrs.getRetrievability(card, now);
  return Math.round(retrievability * 100);
}

export function getCardMasteryInfo(card: FSRSCard, now: Date = new Date()): CardMastery {
  const mastery = calculateCardMastery(card, now);
  const intervalMs = card.dueDate.getTime() - (card.lastReview?.getTime() || now.getTime());
  const intervalDays = Math.max(0, Math.round(intervalMs / (1000 * 60 * 60 * 24)));
  const isOverdue = card.dueDate.getTime() < now.getTime();

  return {
    mastery,
    state: card.state,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    intervalDays,
    isOverdue,
    lastReview: card.lastReview,
    nextReview: card.dueDate,
  };
}

export function calculateCollectionMastery(
  cardMap: Map<string, FSRSCard>,
  now: Date = new Date()
): CollectionMastery {
  let totalMastery = 0;
  let masteredCount = 0;
  let learningCount = 0;
  let newCount = 0;

  cardMap.forEach((card) => {
    const mastery = calculateCardMastery(card, now);
    totalMastery += mastery;

    if (card.state === 'new' || !card.lastReview) {
      newCount++;
    } else if (mastery >= 90) {
      masteredCount++;
    } else {
      learningCount++;
    }
  });

  const totalCards = cardMap.size;
  const averageMastery = totalCards > 0 ? Math.round(totalMastery / totalCards) : 0;

  return {
    averageMastery,
    masteredCount,
    learningCount,
    newCount,
    totalCards,
  };
}

export function getStateLabel(state: CardState): string {
  switch (state) {
    case 'new': return 'Nowa';
    case 'learning': return 'W nauce';
    case 'review': return 'Powtórka';
    case 'relearning': return 'Ponowna nauka';
  }
}

export function getMasteryColor(mastery: number, theme: any): string {
  if (mastery >= 90) return theme.success;
  if (mastery >= 60) return theme.primary;
  if (mastery >= 30) return theme.warning;
  if (mastery > 0) return theme.destructive;
  return theme.textMuted;
}

export function getMasteryBgColor(mastery: number, theme: any): string {
  if (mastery >= 90) return theme.successLight;
  if (mastery >= 60) return theme.primaryMuted;
  if (mastery >= 30) return theme.warningLight;
  if (mastery > 0) return theme.destructiveLight;
  return theme.backgroundAlt;
}

export function getStateColor(state: CardState, theme: any): string {
  switch (state) {
    case 'new': return theme.warning;
    case 'learning': return theme.primary;
    case 'review': return theme.success;
    case 'relearning': return theme.destructive;
  }
}

export function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Łatwa';
  if (difficulty <= 5) return 'Średnia';
  if (difficulty <= 7) return 'Trudna';
  return 'Bardzo trudna';
}

export function formatStability(days: number): string {
  if (days < 1) return '<1d';
  if (days < 7) return `${Math.round(days)}d`;
  if (days < 30) return `${Math.round(days / 7)}tyg.`;
  if (days < 365) return `${Math.round(days / 30)}mies.`;
  return `${(days / 365).toFixed(1)}r.`;
}

export function formatNextReview(date: Date | null, now: Date = new Date()): string {
  if (!date) return '—';

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Zaległa';
  if (diffDays === 0) return 'Dziś';
  if (diffDays === 1) return 'Jutro';
  if (diffDays < 7) return `Za ${diffDays}d`;
  if (diffDays < 30) return `Za ${Math.round(diffDays / 7)}tyg.`;
  if (diffDays < 365) return `Za ${Math.round(diffDays / 30)}mies.`;

  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export function formatLastReview(date: Date | null, now: Date = new Date()): string {
  if (!date) return 'Nigdy';

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Dziś';
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays}d temu`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)}tyg. temu`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)}mies. temu`;

  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}
