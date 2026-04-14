import { supabase } from '@/lib/supabase';
import { GeminiService } from './gemini';

export interface QuizQuestion {
  id: string;
  flashcardId: string;
  question: string;
  correctAnswer: string;
  options: string[];
  correctIndex: number;
}

export interface QuizFlashcard {
  id: string;
  front: string;
  back: string;
  collection_id: string;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const QuizService = {
  async getFlashcards(
    userId: string,
    collectionId?: string | 'all'
  ): Promise<QuizFlashcard[]> {
    let query = supabase
      .from('flashcards')
      .select('id, front, back, collection_id')
      .eq('user_id', userId);

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async generateQuizQuestions(
    flashcards: QuizFlashcard[],
    questionCount: number = 10,
    targetLang: string = 'EN'
  ): Promise<QuizQuestion[]> {
    if (flashcards.length === 0) return [];

    const selectedCards = shuffle(flashcards).slice(0, questionCount);

    const questions = await Promise.all(
      selectedCards.map(card =>
        this.generateSingleQuestion(card, flashcards, targetLang)
      )
    );

    return questions;
  },

  async generateSingleQuestion(
    card: QuizFlashcard,
    allCards: QuizFlashcard[],
    targetLang: string
  ): Promise<QuizQuestion> {
    const correctAnswer = card.back;

    const otherAnswers = allCards
      .filter(c => c.id !== card.id)
      .map(c => c.back);

    let distractors: string[];

    if (otherAnswers.length >= 3) {
      const collectionDistractors = shuffle(otherAnswers).slice(0, 1);

      try {
        const aiDistractors = await GeminiService.generateDistractors(
          correctAnswer,
          targetLang,
          2
        );
        distractors = [...collectionDistractors, ...aiDistractors].slice(0, 3);
      } catch (error: any) {
        distractors = shuffle(otherAnswers).slice(0, 3);
      }
    } else {
      try {
        distractors = await GeminiService.generateDistractors(
          correctAnswer,
          targetLang,
          3
        );

        if (distractors.length < 3) {
          distractors = [...distractors, ...otherAnswers].slice(0, 3);
        }
      } catch (error: any) {
        distractors = otherAnswers.slice(0, 3);
      }
    }

    if (distractors.length === 0) {
      distractors = ['???', '???', '???'];
    }

    const allOptions = [correctAnswer, ...distractors];
    const shuffledOptions = shuffle(allOptions);
    const correctIndex = shuffledOptions.indexOf(correctAnswer);

    return {
      id: `q_${card.id}`,
      flashcardId: card.id,
      question: `Jak przetłumaczyć "${card.front}"?`,
      correctAnswer,
      options: shuffledOptions,
      correctIndex,
    };
  },

  checkAnswer(question: QuizQuestion, selectedIndex: number): boolean {
    return selectedIndex === question.correctIndex;
  },

  calculateScore(
    correctCount: number,
    totalQuestions: number
  ): { score: number; percentage: number; grade: string } {
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    let grade: string;
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    else grade = 'F';

    return { score: correctCount, percentage, grade };
  },

  async saveQuizResult(
    userId: string,
    collectionId: string,
    score: number,
    totalQuestions: number,
    timeSeconds: number
  ): Promise<void> {
    // Placeholder for future database persistence
  },
};
