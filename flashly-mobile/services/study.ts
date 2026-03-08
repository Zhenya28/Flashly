/**
 * StudyService - FSRS-powered study session management with Supabase
 * 
 * Uses ONLY existing Supabase schema columns:
 * - next_review_at (timestamp)
 * - last_studied_at (timestamp)
 * - ease_factor (float)
 * - interval (integer - days)
 * - box (integer 0-5)
 * 
 * FSRS state is calculated but mapped to these existing columns.
 */

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
  isPracticeMode: boolean; // true when no due cards - practicing already learned cards
}

export const StudyService = {
  /**
   * Get cards for a study session
   * Returns cards that are:
   * 1. Due for review (next_review_at <= now)
   * 2. New (no study log yet)
   * 3. If no due/new cards - returns all cards sorted by difficulty (practice mode)
   */
  async getSessionCards(
    userId: string,
    collectionId?: string
  ): Promise<SessionCardsResult> {
    const now = new Date().toISOString();

    // Get all flashcards for user/collection
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

    // Get study logs for these flashcards (with ease_factor for sorting)
    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('flashcard_id, next_review_at, ease_factor')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (logsError) throw logsError;

    // Create map of flashcard_id -> study log
    const logMap = new Map<string, { next_review_at: string; ease_factor: number | null }>();
    (studyLogs || []).forEach(log => {
      logMap.set(log.flashcard_id, {
        next_review_at: log.next_review_at,
        ease_factor: log.ease_factor
      });
    });

    // Filter to get due and new cards
    const dueCards: FlashcardData[] = [];
    const newCards: FlashcardData[] = [];

    flashcards.forEach(card => {
      const log = logMap.get(card.id);
      if (!log) {
        // New card - never studied
        newCards.push(card);
      } else if (!log.next_review_at || new Date(log.next_review_at) <= new Date(now)) {
        // Due for review (or missing review date — treat as due)
        dueCards.push(card);
      }
    });

    // If we have due or new cards, return them normally
    if (dueCards.length > 0 || newCards.length > 0) {
      return {
        cards: [...dueCards, ...newCards],
        isPracticeMode: false
      };
    }

    // No due cards - Practice Mode!
    // Return all cards sorted by ease_factor ascending (lowest = hardest first)
    const sortedCards = [...flashcards].sort((a, b) => {
      const logA = logMap.get(a.id);
      const logB = logMap.get(b.id);
      const easeA = logA?.ease_factor ?? 2.5;
      const easeB = logB?.ease_factor ?? 2.5;
      return easeA - easeB; // Lower ease_factor = harder = first
    });

    return {
      cards: sortedCards,
      isPracticeMode: true
    };
  },

  /**
   * Get "Hard Mode" cards (highest FSRS difficulty)
   * Returns top 15 hardest cards regardless of due date
   */
  async getHardCards(
    userId: string,
    collectionId?: string
  ): Promise<SessionCardsResult> {
    // Get all flashcards
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

    // Get logs with FSRS difficulty column (primary) and ease_factor (fallback)
    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('flashcard_id, difficulty, ease_factor, lapses')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (logsError) throw logsError;

    // Map logs: use FSRS difficulty (1-10, higher = harder)
    const logMap = new Map<string, number>();
    (studyLogs || []).forEach(log => {
      // Use FSRS difficulty if available, otherwise derive from ease_factor
      const diff = log.difficulty && log.difficulty > 0
        ? log.difficulty
        : log.ease_factor
          ? Math.max(1, Math.min(10, (3.0 - log.ease_factor) * (9 / 1.7) + 1))
          : 5;
      // Boost difficulty score for cards with many lapses
      const lapsesBoost = (log.lapses || 0) * 0.5;
      logMap.set(log.flashcard_id, diff + lapsesBoost);
    });

    // Filter only studied cards
    const studiedCards = flashcards.filter(c => logMap.has(c.id));

    if (studiedCards.length === 0) {
      return { cards: [], isPracticeMode: true };
    }

    // Sort by difficulty DESCENDING (highest = hardest first)
    const hardCards = studiedCards.sort((a, b) => {
      return (logMap.get(b.id) || 5) - (logMap.get(a.id) || 5);
    });

    // Take top 15
    return {
      cards: hardCards.slice(0, 15),
      isPracticeMode: true // Hard mode is always separate from main schedule
    };
  },

  /**
   * Get FSRS card state for a flashcard
   * Maps existing schema columns to FSRSCard structure
   */
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

  /**
   * Get FSRS card states for multiple flashcards in one query
   */
  async getStudyLogsBatch(flashcardIds: string[], userId: string): Promise<Map<string, FSRSCard>> {
    const { data: logs, error } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (error) throw error;

    const logMap = new Map<string, FSRSCard>();

    // Initialize all cards as new
    flashcardIds.forEach(id => {
      logMap.set(id, { ...INITIAL_CARD });
    });

    // Override with actual log data
    (logs || []).forEach(log => {
      logMap.set(log.flashcard_id, this.mapLogToFSRSCard(log));
    });

    return logMap;
  },

  /**
   * Helper: Map a study log to FSRSCard structure
   */
  mapLogToFSRSCard(log: any): FSRSCard {
    if (!log) {
      return { ...INITIAL_CARD };
    }

    // Use FSRS columns if available, fall back to legacy SM-2 mapping
    const hasfsrsData = log.stability != null && log.stability > 0;

    if (hasfsrsData) {
      return {
        stability: log.stability,
        difficulty: log.difficulty ?? 5,
        dueDate: log.next_review_at ? new Date(log.next_review_at) : new Date(),
        lastReview: log.last_studied_at ? new Date(log.last_studied_at) : null,
        reps: log.reps ?? log.box ?? 0,
        lapses: log.lapses ?? 0,
        state: (log.state as FSRSCard['state']) || 'new',
      };
    }

    // Legacy fallback for cards not yet migrated
    let state: FSRSCard['state'] = 'new';
    if (log.box >= 3) state = 'review';
    else if (log.box >= 1) state = 'learning';

    return {
      stability: log.ease_factor ?? 2.5,
      difficulty: 5,
      dueDate: log.next_review_at ? new Date(log.next_review_at) : new Date(),
      lastReview: log.last_studied_at ? new Date(log.last_studied_at) : null,
      reps: log.box ?? 0,
      lapses: 0,
      state: state,
    };
  },

  /**
   * Save review result and update scheduling
   * Maps FSRS output to existing schema columns
   */
  async saveReview(
    flashcardId: string,
    userId: string,
    rating: Rating
  ): Promise<FSRSCard> {
    // Get current state
    const currentCard = await this.getStudyLog(flashcardId, userId);
    
    // Calculate next state using FSRS algorithm
    const now = new Date();
    const nextCard = fsrs.review(currentCard, rating, now);

    // Map FSRS state back to box (0-5) for legacy compatibility
    // Account for lapses: effective progress = reps - lapses
    let box = 0;
    if (nextCard.state === 'review') {
      const effectiveReps = Math.max(0, nextCard.reps - nextCard.lapses);
      box = Math.min(5, effectiveReps);
    } else if (nextCard.state === 'learning') {
      box = Math.min(2, nextCard.reps);
    } else if (nextCard.state === 'relearning') {
      box = 1;
    }

    // Calculate interval in days (learning cards with minute intervals -> 0)
    const diffMs = nextCard.dueDate.getTime() - now.getTime();
    const intervalDays = diffMs < 60 * 60 * 1000
      ? 0  // Less than 1 hour = learning interval
      : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Map FSRS difficulty (1-10) to legacy ease_factor (1.3-3.0)
    // difficulty 1 (easiest) -> ease_factor 3.0
    // difficulty 5 (average) -> ease_factor 2.5
    // difficulty 10 (hardest) -> ease_factor 1.3
    const easeFactor = Math.max(1.3, Math.min(3.0, 3.0 - (nextCard.difficulty - 1) * (1.7 / 9)));

    // Save both FSRS columns and legacy columns
    const studyLogData = {
      flashcard_id: flashcardId,
      user_id: userId,
      next_review_at: nextCard.dueDate.toISOString(),
      last_studied_at: now.toISOString(),
      // FSRS columns
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state,
      // Legacy columns (proper mapping for dashboard compatibility)
      ease_factor: easeFactor,
      interval: intervalDays,
      box: box,
    };

    // Upsert: insert or update based on flashcard_id + user_id
    const { error } = await supabase
      .from('study_logs')
      .upsert(studyLogData, {
        onConflict: 'flashcard_id,user_id',
      });

    if (error) {
      console.error('[StudyService] Upsert error:', error);
      throw error;
    }

    console.log('[StudyService] Saved review:', {
      flashcardId,
      rating,
      nextDue: nextCard.dueDate.toISOString(),
      intervalDays,
      box,
    });

    return nextCard;
  },

  /**
   * Get collection by ID
   */
  async getCollectionById(collectionId: string): Promise<{ id: string; title: string } | null> {
    const { data, error } = await supabase
      .from('collections')
      .select('id, title')
      .eq('id', collectionId)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Get statistics for a collection (single collection - for backwards compatibility)
   */
  async getCollectionStats(
    userId: string,
    collectionId: string
  ): Promise<{ due: number; total: number; newCards: number }> {
    const allStats = await this.getAllCollectionStats(userId);
    return allStats[collectionId] || { due: 0, total: 0, newCards: 0 };
  },

  /**
   * Get statistics for ALL collections in a single batch (2 API calls instead of N*4)
   */
  async getAllCollectionStats(
    userId: string
  ): Promise<Record<string, { due: number; total: number; newCards: number }>> {
    const now = new Date();

    // Single query: Get ALL flashcards for this user with their collection_id
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('id, collection_id')
      .eq('user_id', userId);

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError);
      return {};
    }

    if (!flashcards || flashcards.length === 0) {
      return {};
    }

    // Single query: Get ALL study logs for this user
    const flashcardIds = flashcards.map(f => f.id);
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('flashcard_id, next_review_at')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds);

    if (logsError) {
      console.error('Error fetching study logs:', logsError);
    }

    // Create map of flashcard_id -> study log
    const logMap = new Map<string, { next_review_at: string }>();
    (studyLogs || []).forEach(log => {
      logMap.set(log.flashcard_id, { next_review_at: log.next_review_at });
    });

    // Calculate stats per collection in memory
    const statsMap: Record<string, { due: number; total: number; newCards: number }> = {};

    flashcards.forEach(card => {
      const collectionId = card.collection_id;

      if (!statsMap[collectionId]) {
        statsMap[collectionId] = { due: 0, total: 0, newCards: 0 };
      }

      statsMap[collectionId].total++;

      const log = logMap.get(card.id);
      if (!log) {
        // New card - never studied
        statsMap[collectionId].newCards++;
      } else if (!log.next_review_at || new Date(log.next_review_at) <= now) {
        // Due for review (or missing review date — treat as due)
        statsMap[collectionId].due++;
      }
    });

    return statsMap;
  },

  /**
   * Get FSRS card data for all cards in a collection
   * Returns a Map<flashcardId, FSRSCard> for mastery calculations
   */
  async getCollectionCardStats(
    collectionId: string,
    userId: string
  ): Promise<Map<string, FSRSCard>> {
    // Get all flashcard IDs for this collection
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
