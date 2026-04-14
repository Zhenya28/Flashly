import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfDay, subDays, subWeeks, subMonths, subYears, format, eachDayOfInterval, addDays } from 'date-fns';

export type TimeFilter = 'week' | 'month' | 'year';

const SETTINGS_KEY = '@flashly_user_settings';

export interface ProfileStats {
  totalWords: number;
  masteredWords: number;
  successRate: number;
  forgettingRate: number;
  knowledgeGrowth: number;
  currentStreak: number;
  weeklyProgress: number[];
  activityData: ActivityDay[];
  retentionData: RetentionData;
  forecastData: ForecastDay[];
}

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface RetentionData {
  newCards: number;
  youngCards: number;
  matureCards: number;
}

export interface ForecastDay {
  date: string;
  dueCount: number;
  dayLabel: string;
}

export interface UserSettings {
  dailyGoal: number;
  notificationTime: string | null;
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

    const { count: totalWords } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: studyLogs } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('last_studied_at', filterStartDate.toISOString());

    const logs = studyLogs || [];

    const { data: allStudyLogs } = await supabase
      .from('study_logs')
      .select('interval, difficulty, state, lapses, reps')
      .eq('user_id', user.id);

    const allLogs = allStudyLogs || [];

    // Retention categories
    const matureCards = allLogs.filter(log => log.interval > 21).length;
    const newCards = allLogs.filter(log =>
      log.state === 'new' || log.state === 'learning'
    ).length;
    const youngCards = allLogs.filter(log =>
      !(['new', 'learning'].includes(log.state || '')) && log.interval > 0 && log.interval <= 21
    ).length;

    const masteredWords = matureCards;

    // Success rate derived from FSRS difficulty (1=easy → 95%, 10=hard → 30%)
    const studiedCards = allLogs.filter(log =>
      (log.reps && log.reps > 0) || log.interval > 0
    );

    let successRate = 0;
    if (studiedCards.length > 0) {
      const avgDifficulty = studiedCards.reduce((sum, log) => {
        const d = (log.difficulty && log.difficulty > 0) ? log.difficulty : 5;
        return sum + d;
      }, 0) / studiedCards.length;

      const totalReps = studiedCards.reduce((s, l) => s + (l.reps || 0), 0);
      const totalLapses = studiedCards.reduce((s, l) => s + (l.lapses || 0), 0);
      const lapseRatio = totalReps > 0 ? totalLapses / totalReps : 0;

      const baseRate = 95 - (avgDifficulty - 1) * (65 / 9);
      successRate = Math.min(100, Math.max(0, baseRate - lapseRatio * 40));
    }
    const forgettingRate = studiedCards.length > 0 ? 100 - successRate : 0;

    // Knowledge growth = average interval
    const studiedLogs = allLogs.filter(log => log.interval > 0);
    const avgInterval = studiedLogs.length > 0
      ? studiedLogs.reduce((sum, log) => sum + log.interval, 0) / studiedLogs.length
      : 0;
    const knowledgeGrowth = Math.round(avgInterval * 10) / 10;

    // Activity heatmap (last 12 weeks)
    const activityStartDate = subWeeks(now, 12);
    const activityDays = eachDayOfInterval({ start: activityStartDate, end: now });

    const { data: activityLogs } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', user.id)
      .gte('last_studied_at', activityStartDate.toISOString())
      .not('last_studied_at', 'is', null);

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

    // Forecast (next 7 days)
    const forecastStartDate = startOfDay(now);
    const forecastEndDate = addDays(forecastStartDate, 7);

    const { data: forecastLogs } = await supabase
      .from('study_logs')
      .select('next_review_at')
      .eq('user_id', user.id)
      .gte('next_review_at', forecastStartDate.toISOString())
      .lt('next_review_at', forecastEndDate.toISOString())
      .not('next_review_at', 'is', null);

    const { count: overdueCount } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('next_review_at', forecastStartDate.toISOString())
      .not('next_review_at', 'is', null);

    const { count: totalFlashcards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: studiedFlashcards } = await supabase
      .from('study_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const newCardsCount = Math.max(0, (totalFlashcards || 0) - (studiedFlashcards || 0));

    const forecastByDate: Record<string, number> = {};
    (forecastLogs || []).forEach(log => {
      if (log.next_review_at) {
        const dateKey = format(new Date(log.next_review_at), 'yyyy-MM-dd');
        forecastByDate[dateKey] = (forecastByDate[dateKey] || 0) + 1;
      }
    });

    const todayKey = format(forecastStartDate, 'yyyy-MM-dd');
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

    const currentStreak = await this.calculateStreak(user.id);
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

  async getUserSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      // Use defaults on storage error
    }
    return DEFAULT_SETTINGS;
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getUserSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  },

  async updateProfile(data: { full_name?: string; avatar_url?: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (data.full_name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name }
      });
      if (authError) throw authError;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;
  },

  generateDiceBearAvatar(seed: string): string {
    const bgColors = ['e8efff', 'e8f3ea', 'fff5e0', 'e6f2fa', 'ffecec'].join(',');
    return `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColors}`;
  },

  async getWeeklyProgress(userId: string): Promise<number[]> {
    const today = new Date();
    const todayDayOfWeek = today.getDay();

    const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const monday = subDays(today, daysFromMonday);
    const weekStart = startOfDay(monday).toISOString();
    const weekEnd = startOfDay(addDays(monday, 7)).toISOString();

    const { data } = await supabase
      .from('study_logs')
      .select('last_studied_at')
      .eq('user_id', userId)
      .gte('last_studied_at', weekStart)
      .lt('last_studied_at', weekEnd);

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
