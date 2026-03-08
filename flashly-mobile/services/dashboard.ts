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
  progress: number; // 0-100
}

export interface DashboardStats {
  profile: { full_name: string | null; avatar_url: string | null } | null;
  dueCards: number;
  newCards: number;
  cardsToStudy: number; // due + new
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

    // 1. Get Profile (Name + Avatar)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) console.error('Error fetching profile:', profileError);

    // 2. Get Due Cards Count (SM-2: next_review_at <= now)
    const now = new Date().toISOString();
    const { count: dueCardsCount, error: dueError } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review_at', now);

    if (dueError) console.error('Error fetching due cards:', dueError);

    // 2b. Get studied cards count (to calculate new cards)
    const { count: studiedCardsCount } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 3. Get New Words Added Today
    const todayStart = startOfDay(new Date()).toISOString();
    const { count: newWordsCount, error: newWordsError } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart);

    if (newWordsError) console.error('Error fetching new words:', newWordsError);

    // 4. Get Daily Goal from AsyncStorage
    let dailyGoal = 10;
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        dailyGoal = parsed.dailyGoal || 10;
      }
    } catch (e) {
      console.error('Error reading daily goal:', e);
    }

    // 5. Get Last Accessed Deck with Stats
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

    // Fallback to most recent collection if no study activity
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

    // Get deck details and stats
    if (lastDeckId) {
      const { data: deck } = await supabase
        .from('collections')
        .select('id, title')
        .eq('id', lastDeckId)
        .single();

      if (deck) {
        // Get total cards in deck
        const { count: deckTotalCards } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', lastDeckId)
          .eq('user_id', user.id);

        // Get flashcard IDs for this deck
        const { data: deckFlashcards } = await supabase
          .from('flashcards')
          .select('id')
          .eq('collection_id', lastDeckId)
          .eq('user_id', user.id);

        const deckFlashcardIds = deckFlashcards?.map(f => f.id) || [];

        // Get studied cards count for this deck
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

    // 6. Calculate Streak
    const streak = await this.calculateStreak(user.id);

    // 7. Get Total Cards Count
    const { count: totalCards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 8. Get Mastered Cards (interval > 21)
    const { count: masteredCards } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('interval', 21);

    // 9. Get Collections Count
    const { count: collectionsCount } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 10. Get Today's Studied Cards
    const { count: todayStudied } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('last_studied_at', todayStart);

    // 11. Get Weekly Progress (last 7 days of studied cards)
    const weeklyProgress = await this.getWeeklyProgress(user.id);

    // Calculate new cards (cards without study_logs)
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
    // Get all unique study dates ordered descending
    const { data: studyDates, error } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .not('last_studied_at', 'is', null)
      .order('last_studied_at', { ascending: false });

    if (error || !studyDates || studyDates.length === 0) {
      return 0;
    }

    // Get unique dates
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

    // Check if user studied today or yesterday (to keep streak)
    const mostRecentDate = sortedDates[0];
    if (mostRecentDate !== today && mostRecentDate !== yesterday) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 0;
    let expectedDate = mostRecentDate === today ? new Date() : subDays(new Date(), 1);

    for (const dateStr of sortedDates) {
      const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');

      if (dateStr === expectedDateStr) {
        streak++;
        expectedDate = subDays(expectedDate, 1);
      } else if (dateStr < expectedDateStr) {
        // Gap found, streak ends
        break;
      }
      // If dateStr > expectedDateStr, it's a duplicate or future date, skip
    }

    return streak;
  },

  async getWeeklyProgress(userId: string): Promise<number[]> {
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

    // Calculate Monday of current week
    const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const monday = startOfDay(subDays(today, daysFromMonday));

    // Sunday end (next day after Sunday)
    const sundayEnd = new Date(monday);
    sundayEnd.setDate(monday.getDate() + 7);

    // Single query: fetch all study logs for this week
    const { data: logs, error } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .gte('last_studied_at', monday.toISOString())
      .lt('last_studied_at', sundayEnd.toISOString());

    if (error) {
      console.error('Error fetching weekly progress:', error);
      return [0, 0, 0, 0, 0, 0, 0];
    }

    // Count per day in memory
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
