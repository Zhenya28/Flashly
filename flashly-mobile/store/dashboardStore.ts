/**
 * Dashboard Store - Uses DashboardService (Supabase) for dashboard data
 */

import { create } from 'zustand';
import { DashboardService, DashboardStats } from '@/services/dashboard';

// Cache TTL: 10 seconds to prevent excessive refetching on tab switches
const DASHBOARD_CACHE_TTL_MS = 10000;

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: number | null;

  // Actions
  refreshDashboard: (forceRefresh?: boolean) => Promise<void>;
  reset: () => void;
}

const initialState = {
  stats: null,
  isLoading: false,
  error: null,
  lastRefresh: null,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,

  refreshDashboard: async (forceRefresh = false) => {
    const { isLoading, lastRefresh, stats } = get();

    // Prevent concurrent fetches
    if (isLoading) return;

    // Use cache if data is fresh (unless force refresh)
    if (!forceRefresh && lastRefresh && stats) {
      const age = Date.now() - lastRefresh;
      if (age < DASHBOARD_CACHE_TTL_MS) {
        return; // Data is fresh, skip fetch
      }
    }

    set({ isLoading: true, error: null });
    try {
      const data = await DashboardService.getDashboardStats();
      set({
        stats: data,
        isLoading: false,
        lastRefresh: Date.now(),
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to refresh dashboard:', error);
    }
  },

  reset: () => {
    set(initialState);
  }
}));
