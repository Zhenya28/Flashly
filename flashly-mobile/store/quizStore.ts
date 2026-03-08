/**
 * Quiz Store - State management for quiz sessions
 * 
 * Manages quiz questions, progress, scoring, and timer
 */

import { create } from 'zustand';
import { QuizService, QuizQuestion } from '@/services/quiz';
import { useAuthStore } from './authStore';
import { supabase } from '@/lib/supabase';

interface QuizStats {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeElapsed: number;
  currentStreak: number;
  bestStreak: number;
}

const initialStats: QuizStats = {
  totalQuestions: 0,
  answeredQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  timeElapsed: 0,
  currentStreak: 0,
  bestStreak: 0,
};

interface QuizState {
  // Session state
  questions: QuizQuestion[];
  currentIndex: number;
  isLoading: boolean;
  isSessionComplete: boolean;
  isCollectionEmpty: boolean;
  error: string | null;
  
  // Quiz info
  collectionId: string | null;
  collectionTitle: string;
  targetLang: string;
  
  // Stats
  stats: QuizStats;
  
  // Timer
  startTime: number | null;
  
  // Answer feedback
  selectedAnswer: number | null;
  isAnswerRevealed: boolean;
  isCorrect: boolean | null;
  
  // Actions
  startQuiz: (collectionId: string, questionCount?: number) => Promise<void>;
  selectAnswer: (optionIndex: number) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
  getProgress: () => number;
  getTimeElapsed: () => number;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  // Initial state
  questions: [],
  currentIndex: 0,
  isLoading: false,
  isSessionComplete: false,
  isCollectionEmpty: false,
  error: null,
  collectionId: null,
  collectionTitle: '',
  targetLang: 'EN',
  stats: { ...initialStats },
  startTime: null,
  selectedAnswer: null,
  isAnswerRevealed: false,
  isCorrect: null,

  startQuiz: async (collectionId: string, questionCount?: number) => {
    if (get().isLoading) return;
    set({
      isLoading: true,
      error: null,
      questions: [],
      currentIndex: 0,
      isSessionComplete: false,
      isCollectionEmpty: false,
      collectionId,
      stats: { ...initialStats },
      startTime: null,
      selectedAnswer: null,
      isAnswerRevealed: false,
      isCorrect: null,
    });

    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Get collection info (if specific collection)
      let collectionTitle = 'Szybki Quiz';
      let targetLang = 'EN'; // Default fallback

      if (collectionId !== 'all') {
        const { data: collection, error: collError } = await supabase
          .from('collections')
          .select('title, target_lang')
          .eq('id', collectionId)
          .single();

        if (collError) throw collError;
        collectionTitle = collection.title;
        targetLang = collection.target_lang || 'EN';
      }

      // Get flashcards
      const flashcards = await QuizService.getFlashcards(userId, collectionId);
      
      if (flashcards.length === 0) {
        set({
          isLoading: false,
          isCollectionEmpty: true,
          questions: [],
        });
        return;
      }

      // Generate quiz questions
      // If questionCount is provided, use it. Otherwise use all cards.
      // For 'all' (Quick Quiz), default to 10 if not specified? 
      // Actually, let's make Quick Quiz default to 10 in the calling component if needed, 
      // or here if collectionId === 'all'.
      
      let targetCount = flashcards.length;
      if (questionCount) {
        targetCount = Math.min(questionCount, flashcards.length);
      } else if (collectionId === 'all') {
        // Default limit for global quick quiz if not specified
        targetCount = Math.min(10, flashcards.length);
      }

      const questions = await QuizService.generateQuizQuestions(
        flashcards,
        targetCount,
        targetLang
      );

      set({
        questions,
        collectionTitle,
        targetLang,
        isLoading: false,
        startTime: Date.now(),
        stats: {
          ...initialStats,
          totalQuestions: questions.length,
        },
      });
    } catch (e: any) {
      console.error('Failed to start quiz:', e);
      set({
        isLoading: false,
        error: e.message || 'Nie udało się uruchomić quizu',
      });
    }
  },

  selectAnswer: (optionIndex: number) => {
    const { isAnswerRevealed } = get();
    if (isAnswerRevealed) return; // Already answered

    set({ selectedAnswer: optionIndex });
  },

  revealAnswer: () => {
    const { questions, currentIndex, selectedAnswer, stats } = get();
    if (selectedAnswer === null) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = QuizService.checkAnswer(currentQuestion, selectedAnswer);

    // Update streak
    const newStreak = isCorrect ? stats.currentStreak + 1 : 0;
    const newBestStreak = Math.max(stats.bestStreak, newStreak);

    set({
      isAnswerRevealed: true,
      isCorrect,
      stats: {
        ...stats,
        answeredQuestions: stats.answeredQuestions + 1,
        correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
        wrongAnswers: stats.wrongAnswers + (isCorrect ? 0 : 1),
        currentStreak: newStreak,
        bestStreak: newBestStreak,
      },
    });
  },

  nextQuestion: () => {
    const { questions, currentIndex, stats, startTime, collectionId } = get();
    const isLastQuestion = currentIndex >= questions.length - 1;

    if (isLastQuestion) {
      // Quiz complete
      const timeElapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      // Save result
      const userId = useAuthStore.getState().user?.id;
      if (userId && collectionId) {
        QuizService.saveQuizResult(
          userId,
          collectionId,
          stats.correctAnswers,
          stats.totalQuestions,
          timeElapsed
        ).catch(e => console.error('Failed to save quiz result:', e));
      }

      set({
        isSessionComplete: true,
        stats: { ...stats, timeElapsed },
      });
    } else {
      // Move to next question
      set({
        currentIndex: currentIndex + 1,
        selectedAnswer: null,
        isAnswerRevealed: false,
        isCorrect: null,
      });
    }
  },

  resetQuiz: () => {
    set({
      questions: [],
      currentIndex: 0,
      isLoading: false,
      isSessionComplete: false,
      isCollectionEmpty: false,
      error: null,
      collectionId: null,
      collectionTitle: '',
      stats: { ...initialStats },
      startTime: null,
      selectedAnswer: null,
      isAnswerRevealed: false,
      isCorrect: null,
    });
  },

  getProgress: () => {
    const { currentIndex, questions } = get();
    if (questions.length === 0) return 0;
    return ((currentIndex + 1) / questions.length) * 100;
  },

  getTimeElapsed: () => {
    const { startTime } = get();
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  },
}));
