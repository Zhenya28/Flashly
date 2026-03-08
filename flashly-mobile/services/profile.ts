import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfDay, subDays, subWeeks, subMonths, subYears, format, eachDayOfInterval, addDays } from 'date-fns';

export type TimeFilter = 'week' | 'month' | 'year';

const SETTINGS_KEY = '@flashly_user_settings';

export interface ProfileStats {
  totalWords: number;
  masteredWords: number; // interval > 21 days
  successRate: number; // percentage of reviews with q >= 3
  forgettingRate: number; // percentage of reviews with q < 3
  knowledgeGrowth: number; // average interval increase
  currentStreak: number; // Current daily streak
  weeklyProgress: number[]; // Last 7 days activity (Mon-Sun aligned)
  activityData: ActivityDay[];
  retentionData: RetentionData;
  forecastData: ForecastDay[];
}

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub-style intensity
}

export interface RetentionData {
  newCards: number;      // box = 0 (never studied or failed)
  youngCards: number;    // box > 0 AND interval <= 21 days
  matureCards: number;   // interval > 21 days
}

export interface ForecastDay {
  date: string;
  dueCount: number;
  dayLabel: string;
}

export interface UserSettings {
  dailyGoal: number;
  notificationTime: string | null; // HH:mm format
}

const DEFAULT_SETTINGS: UserSettings = {
  dailyGoal: 10,
  notificationTime: '09:00'
};

export const ProfileService = {
  async getProfileStats(filter: TimeFilter = 'month'): Promise<ProfileStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date();
    let filterStartDate: Date;

    switch (filter) {
      case 'week':
        filterStartDate = subWeeks(now, 1);
        break;
      case 'month':
        filterStartDate = subMonths(now, 1);
        break;
      case 'year':
        filterStartDate = subYears(now, 1);
        break;
    }

    // 1. Get total words count
    const { count: totalWords, error: totalError } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (totalError) console.error('Error fetching total words:', totalError);

    // 2. Get all study logs for analysis (filtered by time range)
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('last_studied_at', filterStartDate.toISOString());

    if (logsError) console.error('Error fetching study logs:', logsError);

    const logs = studyLogs || [];

    // 3. Get ALL study logs for retention calculation (not filtered by time)
    const { data: allStudyLogs } = await supabase
      .from('study_logs')
      .select('box, interval, ease_factor, difficulty, state, lapses, reps')
      .eq('user_id', user.id);

    const allLogs = allStudyLogs || [];

    // 4. Calculate retention categories using FSRS state when available
    // New: state = 'new' OR (box = 0 AND no FSRS state)
    // Young: in review/learning with interval <= 21
    // Mature: interval > 21
    const matureCards = allLogs.filter(log => log.interval > 21).length;
    const newCards = allLogs.filter(log =>
      log.state === 'new' || log.state === 'learning' || (log.box === 0 && !log.state)
    ).length;
    const youngCards = allLogs.filter(log =>
      !(['new', 'learning'].includes(log.state || '')) && log.box > 0 && log.interval <= 21
    ).length;

    // 5. Calculate mastered words (interval > 21 days)
    const masteredWords = matureCards;

    // 6. Calculate success rate using FSRS difficulty when available
    // FSRS difficulty: 1 (easy) to 10 (hard), default ~5
    // ease_factor: 1.3 (hard) to 3.0 (easy), default 2.5
    const studiedCards = allLogs.filter(log =>
      (log.reps && log.reps > 0) || log.box > 0 || log.interval > 0
    );

    let successRate = 0;
    if (studiedCards.length > 0) {
      // Prefer FSRS difficulty if available
      const hasFSRS = studiedCards.some(log => log.difficulty != null && log.difficulty > 0);

      if (hasFSRS) {
        // Use FSRS difficulty: low difficulty = high success
        // difficulty 1 -> 95%, difficulty 5 -> 65%, difficulty 10 -> 30%
        const avgDifficulty = studiedCards.reduce((sum, log) => {
          const d = (log.difficulty && log.difficulty > 0) ? log.difficulty : 5;
          return sum + d;
        }, 0) / studiedCards.length;

        // Also factor in lapse ratio
        const totalReps = studiedCards.reduce((s, l) => s + (l.reps || 0), 0);
        const totalLapses = studiedCards.reduce((s, l) => s + (l.lapses || 0), 0);
        const lapseRatio = totalReps > 0 ? totalLapses / totalReps : 0;

        // Base rate from difficulty (1->95, 5->65, 10->30)
        const baseRate = 95 - (avgDifficulty - 1) * (65 / 9);
        // Penalize for lapses (0% lapses = no penalty, 50% lapses = -20%)
        successRate = Math.min(100, Math.max(0, baseRate - lapseRatio * 40));
      } else {
        // Fallback: use ease_factor (legacy)
        const avgEaseFactor = studiedCards.reduce((sum, log) =>
          sum + (log.ease_factor || 2.5), 0) / studiedCards.length;

        // 1.3 -> ~30%, 2.5 -> ~70%, 3.0+ -> ~90%
        successRate = Math.min(Math.max(
          ((avgEaseFactor - 1.3) / (3.0 - 1.3)) * 60 + 30,
          0
        ), 100);
      }
    }
    const forgettingRate = studiedCards.length > 0 ? 100 - successRate : 0;

    // 7. Calculate knowledge growth (average interval of studied cards)
    const studiedLogs = allLogs.filter(log => log.interval > 0);
    const avgInterval = studiedLogs.length > 0
      ? studiedLogs.reduce((sum, log) => sum + log.interval, 0) / studiedLogs.length
      : 0;
    const knowledgeGrowth = Math.round(avgInterval * 10) / 10;

    // 8. Generate activity data (last 12 weeks for heatmap)
    const activityStartDate = subWeeks(now, 12);
    const activityDays = eachDayOfInterval({ start: activityStartDate, end: now });

    // Get study activity by date
    const { data: activityLogs, error: activityError } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', user.id)
      .gte('last_studied_at', activityStartDate.toISOString())
      .not('last_studied_at', 'is', null);

    if (activityError) console.error('Error fetching activity:', activityError);

    const activityByDate: Record<string, number> = {};
    (activityLogs || []).forEach(log => {
      if (log.last_studied_at) {
        const dateKey = format(new Date(log.last_studied_at), 'yyyy-MM-dd');
        activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      }
    });

    const activityValues = Object.values(activityByDate);
    const maxActivity = activityValues.length > 0 ? Math.max(...activityValues, 1) : 1;

    const activityData: ActivityDay[] = activityDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const count = activityByDate[dateKey] || 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) {
        const ratio = count / maxActivity;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      }
      return { date: dateKey, count, level };
    });

    // 9. Generate forecast data (next 7 days) + overdue cards
    const forecastStartDate = startOfDay(now);
    const forecastEndDate = addDays(forecastStartDate, 7);

    // Query 1: Cards due in the next 7 days
    const { data: forecastLogs, error: forecastError } = await supabase
      .from('study_logs')
      .select('next_review_at')
      .eq('user_id', user.id)
      .gte('next_review_at', forecastStartDate.toISOString())
      .lt('next_review_at', forecastEndDate.toISOString())
      .not('next_review_at', 'is', null);

    if (forecastError) console.error('Error fetching forecast:', forecastError);

    // Query 2: Overdue cards (next_review_at < today) — count them for "today"
    const { count: overdueCount, error: overdueError } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('next_review_at', forecastStartDate.toISOString())
      .not('next_review_at', 'is', null);

    if (overdueError) console.error('Error fetching overdue:', overdueError);

    // Query 3: New cards (flashcards without any study_log) — also due today
    const { count: totalFlashcards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: studiedFlashcards } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const newCardsCount = Math.max(0, (totalFlashcards || 0) - (studiedFlashcards || 0));

    // Group future cards by date
    const forecastByDate: Record<string, number> = {};
    (forecastLogs || []).forEach(log => {
      if (log.next_review_at) {
        const dateKey = format(new Date(log.next_review_at), 'yyyy-MM-dd');
        forecastByDate[dateKey] = (forecastByDate[dateKey] || 0) + 1;
      }
    });

    const todayKey = format(forecastStartDate, 'yyyy-MM-dd');
    // Add overdue + new cards to today's count
    const todayExtra = (overdueCount || 0) + newCardsCount;
    if (todayExtra > 0) {
      forecastByDate[todayKey] = (forecastByDate[todayKey] || 0) + todayExtra;
    }

    const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
    const forecastData: ForecastDay[] = [];

    for (let i = 0; i < 7; i++) {
      const targetDate = addDays(now, i);
      const dateKey = format(startOfDay(targetDate), 'yyyy-MM-dd');
      const dueCount = forecastByDate[dateKey] || 0;

      forecastData.push({
        date: dateKey,
        dueCount,
        dayLabel: i === 0 ? 'Dziś' : i === 1 ? 'Jutro' : dayNames[targetDate.getDay()]
      });
    }

    // 10. Calculate Streak
    const currentStreak = await this.calculateStreak(user.id);

    // 11. Get Weekly Progress (last 7 days, Monday-Sunday aligned)
    const weeklyProgress = await this.getWeeklyProgress(user.id);

    return {
      totalWords: totalWords || 0,
      masteredWords,
      successRate: Math.round(successRate),
      forgettingRate: Math.round(forgettingRate),
      knowledgeGrowth,
      currentStreak,
      weeklyProgress,
      activityData,
      retentionData: { newCards, youngCards, matureCards },
      forecastData
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

  async getUserSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error reading settings:', error);
    }
    return DEFAULT_SETTINGS;
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const current = await this.getUserSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async updateProfile(data: { full_name?: string; avatar_url?: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update Supabase Auth user_metadata (this is what checkAuth reads)
    if (data.full_name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name }
      });
      if (authError) throw authError;
    }

    // Also update profiles table for persistence
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;
  },

  generateDiceBearAvatar(seed: string): string {
    // using 'bottts' (robots) from DiceBear — gender-neutral, fun, premium PNG
    const bgColors = ['e8efff', 'e8f3ea', 'fff5e0', 'e6f2fa', 'ffecec'].join(',');
    return `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColors}`;
  },

  async getWeeklyProgress(userId: string): Promise<number[]> {
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

    // Calculate Monday of current week
    const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const monday = subDays(today, daysFromMonday);
    const weekStart = startOfDay(monday).toISOString();
    const weekEnd = startOfDay(addDays(monday, 7)).toISOString();

    // Single query for entire week instead of 7 separate queries
    const { data } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .gte('last_studied_at', weekStart)
      .lt('last_studied_at', weekEnd);

    // Group by day in memory
    const progress: number[] = [0, 0, 0, 0, 0, 0, 0];
    if (data) {
      for (const log of data) {
        if (!log.last_studied_at) continue;
        const logDate = new Date(log.last_studied_at);
        const dayIndex = Math.floor((logDate.getTime() - startOfDay(monday).getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          progress[dayIndex]++;
        }
      }
    }

    return progress;
  }
};
