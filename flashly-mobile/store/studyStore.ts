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
  correct: number;
  incorrect: number;
  easy: number;
  good: number;
  hard: number;
  again: number;
  startTime: Date;
  endTime: Date | null;
}

interface StudyState {
  queue: FlashcardWithFSRS[];
  currentIndex: number;
  isLoading: boolean;
  isSessionComplete: boolean;
  isPracticeMode: boolean;
  isCollectionEmpty: boolean;
  error: string | null;
  collectionTitle: string;
  sourceLang: string;
  targetLang: string;
  sessionStats: SessionStats;
  lastCompletedStats: SessionStats | null;
  sessionId: string | null;

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

  clearCompletedStats: () => set({ lastCompletedStats: null }),

  startSession: async (collectionId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ error: 'Nie jesteś zalogowany', isLoading: false });
      return;
    }

    const { sessionId, isLoading, isSessionComplete, queue } = get();
    if (sessionId === collectionId && !isSessionComplete && queue.length > 0 && !isLoading) {
      return;
    }

    if (isLoading) return;

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
          isSessionComplete: true,
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

      const flashcardIds = flashcards.map(f => f.id);
      const fsrsCardMap = await StudyService.getStudyLogsBatch(flashcardIds, userId);

      let studyQueue: FlashcardWithFSRS[] = flashcards.map(flashcard => ({
        flashcard,
        fsrsCard: fsrsCardMap.get(flashcard.id) || { ...INITIAL_CARD },
      }));

      studyQueue = shuffleArray(studyQueue);

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
      set({
        isLoading: false,
        error: e.message || 'Nie udało się załadować sesji',
      });
    }
  },

  // In practice mode, ratings are NOT saved to preserve real statistics
  gradeCard: async (rating: Rating) => {
    const { queue, currentIndex, sessionStats, isPracticeMode } = get();
    const current = queue[currentIndex];

    if (!current) return;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

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

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= queue.length;

    if (isComplete) {
      newStats.endTime = new Date();
    }

    set({
      currentIndex: nextIndex,
      isSessionComplete: isComplete,
      sessionStats: newStats,
      lastCompletedStats: isComplete ? newStats : get().lastCompletedStats,
    });

    if (!isPracticeMode) {
      try {
        await StudyService.saveReview(current.flashcard.id, userId, rating);
      } catch (e) {
        // Will resync on next session
      }
    }
  },

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

  getIntervals: () => {
    const { queue, currentIndex } = get();
    const current = queue[currentIndex];

    if (!current) {
      return { 1: '-', 2: '-', 3: '-', 4: '-' } as Record<Rating, string>;
    }

    return fsrs.getIntervals(current.fsrsCard);
  },

  getCurrentCard: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] || null;
  },
}));

export { RATING_LABELS };
