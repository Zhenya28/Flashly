import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfDay, subDays, differenceInDays, format, isYesterday, isToday } from 'date-fns';

const SETTINGS_KEY = '@flashly_user_settings';

export interface LastDeckStats {
  id: string;
  title: string;
  totalCards: number;
  studiedCards: number;
  dueCards: number;
  progress: number;
}

export interface DashboardStats {
  profile: { full_name: string | null; avatar_url: string | null } | null;
  dueCards: number;
  newCards: number;
  cardsToStudy: number;
  newWordsToday: number;
  dailyGoal: number;
  lastDeck: LastDeckStats | null;
  streak: number;
  totalCards: number;
  masteredCards: number;
  collectionsCount: number;
  todayStudied: number;
  weeklyProgress: number[];
}

export const DashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const now = new Date().toISOString();
    const { count: dueCardsCount } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review_at', now);

    const { count: studiedCardsCount } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const todayStart = startOfDay(new Date()).toISOString();
    const { count: newWordsCount } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart);

    let dailyGoal = 10;
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        dailyGoal = parsed.dailyGoal || 10;
      }
    } catch (e) {
      // Use default
    }

    // Last accessed deck
    let lastDeck: LastDeckStats | null = null;
    let lastDeckId: string | null = null;

    const { data: lastLog } = await supabase
      .from('study_logs')
      .select('flashcard_id, last_studied_at, flashcards!inner(collection_id)')
      .eq('user_id', user.id)
      .order('last_studied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLog?.flashcards) {
      const flashcardData = lastLog.flashcards;
      if (Array.isArray(flashcardData)) {
        lastDeckId = flashcardData[0]?.collection_id ?? null;
      } else if (flashcardData && typeof flashcardData === 'object' && 'collection_id' in flashcardData) {
        lastDeckId = (flashcardData as { collection_id: string }).collection_id;
      }
    }

    if (!lastDeckId) {
      const { data: deck } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      lastDeckId = deck?.id || null;
    }

    if (lastDeckId) {
      const { data: deck } = await supabase
        .from('collections')
        .select('id, title')
        .eq('id', lastDeckId)
        .single();

      if (deck) {
        const { count: deckTotalCards } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', lastDeckId)
          .eq('user_id', user.id);

        const { data: deckFlashcards } = await supabase
          .from('flashcards')
          .select('id')
          .eq('collection_id', lastDeckId)
          .eq('user_id', user.id);

        const deckFlashcardIds = deckFlashcards?.map(f => f.id) || [];

        let deckStudiedCards = 0;
        let deckDueCards = 0;

        if (deckFlashcardIds.length > 0) {
          const { count: studiedCount } = await supabase
            .from('study_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('flashcard_id', deckFlashcardIds);

          const { count: dueCount } = await supabase
            .from('study_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('flashcard_id', deckFlashcardIds)
            .lte('next_review_at', now);

          deckStudiedCards = studiedCount || 0;
          deckDueCards = dueCount || 0;
        }

        const total = deckTotalCards || 0;
        const progress = total > 0 ? Math.round((deckStudiedCards / total) * 100) : 0;

        lastDeck = {
          id: deck.id,
          title: deck.title,
          totalCards: total,
          studiedCards: deckStudiedCards,
          dueCards: deckDueCards,
          progress
        };
      }
    }

    const streak = await this.calculateStreak(user.id);

    const { count: totalCards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: masteredCards } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('interval', 21);

    const { count: collectionsCount } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: todayStudied } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('last_studied_at', todayStart);

    const weeklyProgress = await this.getWeeklyProgress(user.id);

    const newCardsCount = Math.max(0, (totalCards || 0) - (studiedCardsCount || 0));
    const cardsToStudy = (dueCardsCount || 0) + newCardsCount;

    return {
      profile: profile || null,
      dueCards: dueCardsCount || 0,
      newCards: newCardsCount,
      cardsToStudy,
      newWordsToday: newWordsCount || 0,
      dailyGoal,
      lastDeck,
      streak,
      totalCards: totalCards || 0,
      masteredCards: masteredCards || 0,
      collectionsCount: collectionsCount || 0,
      todayStudied: todayStudied || 0,
      weeklyProgress
    };
  },

  async calculateStreak(userId: string): Promise<number> {
    const { data: studyDates, error } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .not('last_studied_at', 'is', null)
      .order('last_studied_at', { ascending: false });

    if (error || !studyDates || studyDates.length === 0) {
      return 0;
    }

    const uniqueDates = new Set<string>();
    studyDates.forEach(log => {
      if (log.last_studied_at) {
        uniqueDates.add(format(new Date(log.last_studied_at), 'yyyy-MM-dd'));
      }
    });

    const sortedDates = Array.from(uniqueDates).sort().reverse();
    if (sortedDates.length === 0) return 0;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    const mostRecentDate = sortedDates[0];
    if (mostRecentDate !== today && mostRecentDate !== yesterday) {
      return 0;
    }

    let streak = 0;
    let expectedDate = mostRecentDate === today ? new Date() : subDays(new Date(), 1);

    for (const dateStr of sortedDates) {
      const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');

      if (dateStr === expectedDateStr) {
        streak++;
        expectedDate = subDays(expectedDate, 1);
      } else if (dateStr < expectedDateStr) {
        break;
      }
    }

    return streak;
  },

  async getWeeklyProgress(userId: string): Promise<number[]> {
    const today = new Date();
    const todayDayOfWeek = today.getDay();

    const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const monday = startOfDay(subDays(today, daysFromMonday));

    const sundayEnd = new Date(monday);
    sundayEnd.setDate(monday.getDate() + 7);

    const { data: logs, error } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .gte('last_studied_at', monday.toISOString())
      .lt('last_studied_at', sundayEnd.toISOString());

    if (error) {
      return [0, 0, 0, 0, 0, 0, 0];
    }

    const progress: number[] = [0, 0, 0, 0, 0, 0, 0];
    (logs || []).forEach(log => {
      if (log.last_studied_at) {
        const logDate = new Date(log.last_studied_at);
        const dayIndex = Math.floor(
          (logDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayIndex >= 0 && dayIndex < 7) {
          progress[dayIndex]++;
        }
      }
    });

    return progress;
  }
};
