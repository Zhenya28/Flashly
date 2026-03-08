/**
 * Profile Store - Uses ProfileService (Supabase) for profile statistics
 */

import { create } from 'zustand';
import { ProfileService, ProfileStats, TimeFilter, UserSettings } from '@/services/profile';
import { NotificationService } from '@/services/notifications';

// Cache TTL: 10 seconds to prevent excessive refetching on tab switches
const PROFILE_CACHE_TTL_MS = 10000;

interface ProfileState {
  stats: ProfileStats | null;
  settings: UserSettings | null;
  timeFilter: TimeFilter;
  isLoading: boolean;
  isSettingsLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // Actions
  fetchStats: (forceRefresh?: boolean) => Promise<void>;
  fetchSettings: () => Promise<void>;
  setTimeFilter: (filter: TimeFilter) => void;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateDailyGoal: (goal: number) => Promise<void>;
  updateNotificationTime: (time: string | null) => Promise<void>;
  reset: () => void;
}

const initialState = {
  stats: null,
  settings: null,
  timeFilter: 'month' as TimeFilter,
  isLoading: false,
  isSettingsLoading: false,
  error: null,
  lastFetchedAt: null as number | null,
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...initialState,

  fetchStats: async (forceRefresh = false) => {
    const { timeFilter, isLoading, lastFetchedAt, stats } = get();

    // Prevent concurrent fetches
    if (isLoading) return;

    // Use cache if data is fresh (unless force refresh)
    if (!forceRefresh && lastFetchedAt && stats) {
      const age = Date.now() - lastFetchedAt;
      if (age < PROFILE_CACHE_TTL_MS) {
        return; // Data is fresh, skip fetch
      }
    }

    set({ isLoading: true, error: null });
    try {
      const newStats = await ProfileService.getProfileStats(timeFilter);
      set({ stats: newStats, isLoading: false, lastFetchedAt: Date.now() });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to fetch profile stats:', error);
    }
  },

  fetchSettings: async () => {
    set({ isSettingsLoading: true });
    try {
      const settings = await ProfileService.getUserSettings();
      set({ settings, isSettingsLoading: false });
    } catch (error: any) {
      set({ isSettingsLoading: false });
      console.error('Failed to fetch settings:', error);
    }
  },

  setTimeFilter: (filter: TimeFilter) => {
    set({ timeFilter: filter, lastFetchedAt: null });
    get().fetchStats(true);
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const currentSettings = get().settings;

    // Optimistic update
    if (currentSettings) {
      set({ settings: { ...currentSettings, ...newSettings } });
    }

    try {
      await ProfileService.updateUserSettings(newSettings);
    } catch (error) {
      // Revert on error
      if (currentSettings) {
        set({ settings: currentSettings });
      }
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  updateDailyGoal: async (goal: number) => {
    const settings = get().settings;
    const previousGoal = settings?.dailyGoal;

    // Optimistic update
    if (settings) {
      set({ settings: { ...settings, dailyGoal: goal } });
    }

    try {
      await ProfileService.updateUserSettings({ dailyGoal: goal });
    } catch (error) {
      // Revert on error
      if (settings && previousGoal !== undefined) {
        set({ settings: { ...settings, dailyGoal: previousGoal } });
      }
      console.error('Failed to save daily goal:', error);
    }
  },

  updateNotificationTime: async (time: string | null) => {
    const settings = get().settings;
    const previousTime = settings?.notificationTime;

    // Optimistic update
    if (settings) {
      set({ settings: { ...settings, notificationTime: time } });
    }

    try {
      await ProfileService.updateUserSettings({ notificationTime: time });
      
      // Update actual schedule
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        await NotificationService.scheduleDailyReminder(hours, minutes);
      } else {
        await NotificationService.cancelAll();
      }
    } catch (error) {
      // Revert on error
      if (settings) {
        set({ settings: { ...settings, notificationTime: previousTime ?? null } });
      }
      console.error('Failed to save notification time:', error);
    }
  },

  reset: () => {
    set(initialState);
  }
}));
