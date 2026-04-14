import { supabase } from '@/lib/supabase';
import { fsrs, FSRSCard, Rating, INITIAL_CARD } from '@/lib/fsrs';

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
  collection_id: string;
}

export interface SessionCardsResult {
  cards: FlashcardData[];
  isPracticeMode: boolean;
}

export const StudyService = {
  // Returns due cards, new cards, or all cards sorted by difficulty (practice mode)
  async getSessionCards(
    userId: string,
    collectionId?: string
  ): Promise<SessionCardsResult> {
    const now = new Date().toISOString();

    let flashcardsQuery = supabase
      .from('flashcards')
      .select('id, front, back, image_url, collection_id')
      .eq('user_id', userId);

    if (collectionId) {
      flashcardsQuery = flashcardsQuery.eq('collection_id', collectionId);
    }

    const { data: flashcards, error: flashcardsError } = await flashcardsQuery;
    if (flashcardsError) throw flashcardsError;
    if (!flashcards || flashcards.length === 0) {
      return { cards: [], isPracticeMode: false };
    }

    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('flashcard_id, next_review_at, difficulty')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (logsError) throw logsError;

    const logMap = new Map<string, { next_review_at: string; difficulty: number | null }>();
    (studyLogs || []).forEach(log => {
      logMap.set(log.flashcard_id, {
        next_review_at: log.next_review_at,
        difficulty: log.difficulty
      });
    });

    const dueCards: FlashcardData[] = [];
    const newCards: FlashcardData[] = [];

    flashcards.forEach(card => {
      const log = logMap.get(card.id);
      if (!log) {
        newCards.push(card);
      } else if (!log.next_review_at || new Date(log.next_review_at) <= new Date(now)) {
        dueCards.push(card);
      }
    });

    if (dueCards.length > 0 || newCards.length > 0) {
      return {
        cards: [...dueCards, ...newCards],
        isPracticeMode: false
      };
    }

    // Practice mode: all cards sorted by difficulty (hardest first)
    const sortedCards = [...flashcards].sort((a, b) => {
      const diffA = logMap.get(a.id)?.difficulty ?? 5;
      const diffB = logMap.get(b.id)?.difficulty ?? 5;
      return diffB - diffA;
    });

    return {
      cards: sortedCards,
      isPracticeMode: true
    };
  },

  // Returns top 15 hardest cards regardless of due date
  async getHardCards(
    userId: string,
    collectionId?: string
  ): Promise<SessionCardsResult> {
    let flashcardsQuery = supabase
      .from('flashcards')
      .select('id, front, back, image_url, collection_id')
      .eq('user_id', userId);

    if (collectionId && collectionId !== 'all') {
      flashcardsQuery = flashcardsQuery.eq('collection_id', collectionId);
    }

    const { data: flashcards, error: flashcardsError } = await flashcardsQuery;
    if (flashcardsError) throw flashcardsError;

    if (!flashcards || flashcards.length === 0) {
      return { cards: [], isPracticeMode: true };
    }

    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('flashcard_id, difficulty, lapses')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (logsError) throw logsError;

    // Score = difficulty + lapses bonus
    const logMap = new Map<string, number>();
    (studyLogs || []).forEach(log => {
      const diff = log.difficulty && log.difficulty > 0 ? log.difficulty : 5;
      const lapsesBoost = (log.lapses || 0) * 0.5;
      logMap.set(log.flashcard_id, diff + lapsesBoost);
    });

    const studiedCards = flashcards.filter(c => logMap.has(c.id));

    if (studiedCards.length === 0) {
      return { cards: [], isPracticeMode: true };
    }

    const hardCards = studiedCards.sort((a, b) => {
      return (logMap.get(b.id) || 5) - (logMap.get(a.id) || 5);
    });

    return {
      cards: hardCards.slice(0, 15),
      isPracticeMode: true
    };
  },

  async getStudyLog(flashcardId: string, userId: string): Promise<FSRSCard> {
    const { data: log, error } = await supabase
      .from('study_logs')
      .select('*')
      .eq('flashcard_id', flashcardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return this.mapLogToFSRSCard(log);
  },

  async getStudyLogsBatch(flashcardIds: string[], userId: string): Promise<Map<string, FSRSCard>> {
    const { data: logs, error } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (error) throw error;

    const logMap = new Map<string, FSRSCard>();

    flashcardIds.forEach(id => {
      logMap.set(id, { ...INITIAL_CARD });
    });

    (logs || []).forEach(log => {
      logMap.set(log.flashcard_id, this.mapLogToFSRSCard(log));
    });

    return logMap;
  },

  mapLogToFSRSCard(log: any): FSRSCard {
    if (!log) {
      return { ...INITIAL_CARD };
    }

    return {
      stability: log.stability ?? 0,
      difficulty: log.difficulty ?? 5,
      dueDate: log.next_review_at ? new Date(log.next_review_at) : new Date(),
      lastReview: log.last_studied_at ? new Date(log.last_studied_at) : null,
      reps: log.reps ?? 0,
      lapses: log.lapses ?? 0,
      state: (log.state as FSRSCard['state']) || 'new',
    };
  },

  async saveReview(
    flashcardId: string,
    userId: string,
    rating: Rating
  ): Promise<FSRSCard> {
    const currentCard = await this.getStudyLog(flashcardId, userId);

    const now = new Date();
    const nextCard = fsrs.review(currentCard, rating, now);

    const diffMs = nextCard.dueDate.getTime() - now.getTime();
    const intervalDays = diffMs < 60 * 60 * 1000
      ? 0
      : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const studyLogData = {
      flashcard_id: flashcardId,
      user_id: userId,
      next_review_at: nextCard.dueDate.toISOString(),
      last_studied_at: now.toISOString(),
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state,
      interval: intervalDays,
    };

    const { error } = await supabase
      .from('study_logs')
      .upsert(studyLogData, {
        onConflict: 'flashcard_id,user_id',
      });

    if (error) throw error;

    return nextCard;
  },

  async getCollectionById(collectionId: string): Promise<{ id: string; title: string } | null> {
    const { data, error } = await supabase
      .from('collections')
      .select('id, title')
      .eq('id', collectionId)
      .single();

    if (error) return null;
    return data;
  },

  async getCollectionStats(
    userId: string,
    collectionId: string
  ): Promise<{ due: number; total: number; newCards: number }> {
    const allStats = await this.getAllCollectionStats(userId);
    return allStats[collectionId] || { due: 0, total: 0, newCards: 0 };
  },

  // Batched stats for all collections (2 queries instead of N*4)
  async getAllCollectionStats(
    userId: string
  ): Promise<Record<string, { due: number; total: number; newCards: number }>> {
    const now = new Date();

    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('id, collection_id')
      .eq('user_id', userId);

    if (flashcardsError) return {};
    if (!flashcards || flashcards.length === 0) return {};

    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs } = await supabase
      .from('study_logs')
      .select('flashcard_id, next_review_at')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    const logMap = new Map<string, { next_review_at: string }>();
    (studyLogs || []).forEach(log => {
      logMap.set(log.flashcard_id, { next_review_at: log.next_review_at });
    });

    const statsMap: Record<string, { due: number; total: number; newCards: number }> = {};

    flashcards.forEach(card => {
      const collectionId = card.collection_id;

      if (!statsMap[collectionId]) {
        statsMap[collectionId] = { due: 0, total: 0, newCards: 0 };
      }

      statsMap[collectionId].total++;

      const log = logMap.get(card.id);
      if (!log) {
        statsMap[collectionId].newCards++;
      } else if (!log.next_review_at || new Date(log.next_review_at) <= now) {
        statsMap[collectionId].due++;
      }
    });

    return statsMap;
  },

  async getCollectionCardStats(
    collectionId: string,
    userId: string
  ): Promise<Map<string, FSRSCard>> {
    const { data: flashcards, error: fError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('user_id', userId);

    if (fError) throw fError;
    if (!flashcards || flashcards.length === 0) return new Map();

    const ids = flashcards.map(f => f.id);
    return this.getStudyLogsBatch(ids, userId);
  },
};
