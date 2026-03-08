/**
 * QuizService - Quiz question generation and management
 * 
 * Handles:
 * - Generating quiz questions from flashcards
 * - Getting distractors (from collection or AI)
 * - Shuffling answer options
 */

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

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const QuizService = {
  /**
   * Get flashcards for quiz from a collection
   */
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

  /**
   * Generate quiz questions from flashcards
   * Uses AI for distractors when collection is too small
   */
  async generateQuizQuestions(
    flashcards: QuizFlashcard[],
    questionCount: number = 10,
    targetLang: string = 'EN'
  ): Promise<QuizQuestion[]> {
    if (flashcards.length === 0) return [];

    // Select random flashcards for the quiz
    const selectedCards = shuffle(flashcards).slice(0, questionCount);
    
    const questions: QuizQuestion[] = [];

    for (const card of selectedCards) {
      const question = await this.generateSingleQuestion(
        card,
        flashcards,
        targetLang
      );
      questions.push(question);
    }

    return questions;
  },

  /**
   * Generate a single quiz question with options
   */
  async generateSingleQuestion(
    card: QuizFlashcard,
    allCards: QuizFlashcard[],
    targetLang: string
  ): Promise<QuizQuestion> {
    const correctAnswer = card.back;
    
    // Get other cards' back values as potential distractors
    const otherAnswers = allCards
      .filter(c => c.id !== card.id)
      .map(c => c.back);

    let distractors: string[];

    if (otherAnswers.length >= 3) {
      // Enough cards in collection - use mix of collection + AI
      // Use 1-2 from collection, rest from AI for variety
      const collectionDistractors = shuffle(otherAnswers).slice(0, 1);
      
      try {
        const aiDistractors = await GeminiService.generateDistractors(
          correctAnswer,
          targetLang,
          2
        );
        distractors = [...collectionDistractors, ...aiDistractors].slice(0, 3);
      } catch {
        // Fallback to all collection words
        distractors = shuffle(otherAnswers).slice(0, 3);
      }
    } else {
      // Not enough cards - use AI to generate all distractors
      try {
        distractors = await GeminiService.generateDistractors(
          correctAnswer,
          targetLang,
          3
        );
        
        // If AI failed, pad with whatever we have
        if (distractors.length < 3) {
          distractors = [...distractors, ...otherAnswers].slice(0, 3);
        }
      } catch {
        // Fallback - if AI fails and not enough collection words,
        // we still create the question but with fewer options
        distractors = otherAnswers.slice(0, 3);
      }
    }

    // Ensure we have at least some options
    if (distractors.length === 0) {
      // Last resort - add placeholder distractors
      distractors = ['???', '???', '???'];
    }

    // Create options array with correct answer
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

  /**
   * Check if answer is correct
   */
  checkAnswer(question: QuizQuestion, selectedIndex: number): boolean {
    return selectedIndex === question.correctIndex;
  },

  /**
   * Calculate quiz score
   */
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

    return {
      score: correctCount,
      percentage,
      grade,
    };
  },

  /**
   * Save quiz result to database
   */
  async saveQuizResult(
    userId: string,
    collectionId: string,
    score: number,
    totalQuestions: number,
    timeSeconds: number
  ): Promise<void> {
    // Note: This requires quiz_results table in Supabase
    // For now, we'll log the result
    console.log('[QuizService] Quiz completed:', {
      userId,
      collectionId,
      score,
      totalQuestions,
      timeSeconds,
      percentage: Math.round((score / totalQuestions) * 100),
    });

    // TODO: Save to database when quiz_results table is created
    // const { error } = await supabase
    //   .from('quiz_results')
    //   .insert({
    //     user_id: userId,
    //     collection_id: collectionId,
    //     score,
    //     total_questions: totalQuestions,
    //     time_seconds: timeSeconds,
    //   });
  },
};
