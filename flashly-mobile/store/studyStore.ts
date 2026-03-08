/**
 * Study Store - Manages study session state with FSRS algorithm
 */

import { create } from 'zustand';
import { StudyService, FlashcardData } from '@/services/study';
import { useAuthStore } from './authStore';
import { fsrs, FSRSCard, Rating, RATING_LABELS, INITIAL_CARD } from '@/lib/fsrs';
import { supabase } from '@/lib/supabase';

export interface FlashcardWithFSRS {
  flashcard: FlashcardData;
  fsrsCard: FSRSCard;
}

export interface SessionStats {
  totalCards: number;
  reviewed: number;
  correct: number;   // rating >= 3 (Good/Easy)
  incorrect: number; // rating < 3 (Again/Hard)
  easy: number;      // rating = 4
  good: number;      // rating = 3
  hard: number;      // rating = 2
  again: number;     // rating = 1
  startTime: Date;
  endTime: Date | null;
}

interface StudyState {
  queue: FlashcardWithFSRS[];
  currentIndex: number;
  isLoading: boolean;
  isSessionComplete: boolean;
  isPracticeMode: boolean; // true when reviewing already-learned cards
  isCollectionEmpty: boolean; // true when collection has no cards at all
  error: string | null;
  collectionTitle: string;
  sourceLang: string;
  targetLang: string;
  sessionStats: SessionStats;
  lastCompletedStats: SessionStats | null;
  sessionId: string | null;

  // Actions
  startSession: (collectionId: string) => Promise<void>;
  gradeCard: (rating: Rating) => Promise<void>;
  resetSession: () => void;
  skipCard: () => void;
  clearCompletedStats: () => void;
  getIntervals: () => Record<Rating, string>;
  getCurrentCard: () => FlashcardWithFSRS | null;
}

const initialStats: SessionStats = {
  totalCards: 0,
  reviewed: 0,
  correct: 0,
  incorrect: 0,
  easy: 0,
  good: 0,
  hard: 0,
  again: 0,
  startTime: new Date(),
  endTime: null,
};

// Fisher-Yates shuffle algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const useStudyStore = create<StudyState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isLoading: false,
  isSessionComplete: false,
  isPracticeMode: false,
  isCollectionEmpty: false,
  error: null,
  collectionTitle: '',
  sourceLang: 'PL',
  targetLang: 'EN',
  sessionStats: { ...initialStats },
  lastCompletedStats: null,
  sessionId: null,

  /**
   * Reset the study session
   */
  resetSession: () => {
    const { isSessionComplete, sessionStats } = get();
    const completedStats =
      isSessionComplete && sessionStats.reviewed > 0 ? sessionStats : null;

    set({
      queue: [],
      currentIndex: 0,
      isSessionComplete: false,
      isPracticeMode: false,
      isCollectionEmpty: false,
      isLoading: false,
      error: null,
      collectionTitle: '',
      sessionStats: { ...initialStats, startTime: new Date() },
      lastCompletedStats: completedStats || get().lastCompletedStats,
      sessionId: null,
    });
  },

  /**
   * Clear completed session stats
   */
  clearCompletedStats: () => set({ lastCompletedStats: null }),

  /**
   * Start a new study session
   */
  startSession: async (collectionId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ error: 'Nie jesteś zalogowany', isLoading: false });
      return;
    }

    // Prevent restarting the same session
    const { sessionId, isLoading, isSessionComplete, queue } = get();
    if (sessionId === collectionId && !isSessionComplete && queue.length > 0 && !isLoading) {
      console.log('Session already active for:', collectionId);
      return;
    }

    // If already loading, don't start another request
    if (isLoading) {
      console.log('Session already loading, skipping...');
      return;
    }

    // Set loading immediately to prevent concurrent calls
    set({ isLoading: true });

    try {
      set({
        isSessionComplete: false,
        isPracticeMode: false,
        isCollectionEmpty: false,
        currentIndex: 0,
        queue: [],
        error: null,
        sessionStats: { ...initialStats, startTime: new Date() },
        sessionId: collectionId,
      });

      // Get cards for this session from Supabase
      let result;
      
      if (collectionId === 'hard_mode') {
        result = await StudyService.getHardCards(userId);
      } else {
        result = await StudyService.getSessionCards(
          userId,
          collectionId === 'all' ? undefined : collectionId
        );
      }

      const { cards: flashcards, isPracticeMode } = result;

      if (flashcards.length === 0) {
        set({
          isLoading: false,
          isSessionComplete: true, // Keep true to stop loading, but UI will check isCollectionEmpty first
          isPracticeMode: false,
          isCollectionEmpty: true,
          collectionTitle: collectionId === 'all' ? 'Wszystkie' : collectionId === 'hard_mode' ? 'Trudne Słówka' : '',
          sessionStats: {
            ...initialStats,
            totalCards: 0,
            startTime: new Date(),
            endTime: new Date(),
          },
        });
        return;
      }

      // Load FSRS state for all cards in a single batch query
      const flashcardIds = flashcards.map(f => f.id);
      const fsrsCardMap = await StudyService.getStudyLogsBatch(flashcardIds, userId);

      let studyQueue: FlashcardWithFSRS[] = flashcards.map(flashcard => ({
        flashcard,
        fsrsCard: fsrsCardMap.get(flashcard.id) || { ...INITIAL_CARD },
      }));

      // Shuffle the queue to ensure random order every time
      studyQueue = shuffleArray(studyQueue);

      // Get collection title if specific collection
      let collectionTitle = '';
      if (collectionId === 'all') {
        collectionTitle = 'Wszystkie Talie';
      } else if (collectionId === 'hard_mode') {
        collectionTitle = 'Trudne Słówka';
      } else {
        const { data } = await supabase
          .from('collections')
          .select('title, source_lang, target_lang')
          .eq('id', collectionId)
          .single();
        collectionTitle = data?.title || '';
        if (data?.source_lang) set({ sourceLang: data.source_lang });
        if (data?.target_lang) set({ targetLang: data.target_lang });
      }

      set({
        queue: studyQueue,
        isLoading: false,
        isPracticeMode,
        collectionTitle,
        sessionStats: {
          ...initialStats,
          totalCards: studyQueue.length,
          startTime: new Date(),
        },
      });
    } catch (e: any) {
      console.error('Failed to start session:', e);
      set({
        isLoading: false,
        error: e.message || 'Nie udało się załadować sesji',
      });
    }
  },

  /**
   * Grade the current card with FSRS rating (1-4)
   * In practice mode, ratings are NOT saved to preserve real statistics
   */
  gradeCard: async (rating: Rating) => {
    const { queue, currentIndex, sessionStats, isPracticeMode } = get();
    const current = queue[currentIndex];

    if (!current) return;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // Update local session stats (for UI feedback)
    const newStats = { ...sessionStats };
    newStats.reviewed++;

    if (rating >= 3) {
      newStats.correct++;
      if (rating === 4) newStats.easy++;
      else if (rating === 3) newStats.good++;
    } else {
      newStats.incorrect++;
      if (rating === 2) newStats.hard++;
      else if (rating === 1) newStats.again++;
    }

    // Check if session is complete
    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= queue.length;

    if (isComplete) {
      newStats.endTime = new Date();
    }

    // Move to next card (optimistic)
    set({
      currentIndex: nextIndex,
      isSessionComplete: isComplete,
      sessionStats: newStats,
      lastCompletedStats: isComplete ? newStats : get().lastCompletedStats,
    });

    // Only save review to Supabase in NORMAL mode (not practice mode)
    // This preserves real FSRS statistics and scheduling
    if (!isPracticeMode) {
      try {
        await StudyService.saveReview(current.flashcard.id, userId, rating);
      } catch (e) {
        console.error('Failed to save review:', e);
      }
    }
  },

  /**
   * Skip the current card without grading
   */
  skipCard: () => {
    const { queue, currentIndex, sessionStats } = get();
    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= queue.length;

    if (isComplete) {
      set({
        isSessionComplete: true,
        sessionStats: { ...sessionStats, endTime: new Date() },
      });
    } else {
      set({ currentIndex: nextIndex });
    }
  },

  /**
   * Get predicted intervals for all ratings for current card
   */
  getIntervals: () => {
    const { queue, currentIndex } = get();
    const current = queue[currentIndex];

    if (!current) {
      return { 1: '-', 2: '-', 3: '-', 4: '-' } as Record<Rating, string>;
    }

    return fsrs.getIntervals(current.fsrsCard);
  },

  /**
   * Get current card being studied
   */
  getCurrentCard: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] || null;
  },
}));

// Export rating labels for UI
export { RATING_LABELS };
