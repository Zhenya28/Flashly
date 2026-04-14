import { create } from 'zustand';
import { AuthService } from '@/services/auth';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    try {
      set({ isLoading: true });
      const { user, session } = await AuthService.loginWithEmail(email, password);

      const mappedUser: User | null = user ? {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name,
      } : null;

      set({ user: mappedUser, session, isAuthenticated: !!session, isLoading: false });
      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    try {
      set({ isLoading: true });
      const { user, session } = await AuthService.signInWithGoogle();

      if (session) {
        const mappedUser: User | null = user ? {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name,
        } : null;

        set({ user: mappedUser, session, isAuthenticated: !!session, isLoading: false });
        router.replace('/(tabs)');
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, password, name) => {
    try {
      set({ isLoading: true });
      const { user, session } = await AuthService.registerWithEmail(email, password, name);

      const mappedUser: User | null = user ? {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name,
      } : null;

      set({ user: mappedUser, session, isAuthenticated: !!session, isLoading: false });
      router.replace('/(tabs)');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await AuthService.logout();
    set({ user: null, session: null, isAuthenticated: false });
    router.replace('/(auth)/login');
  },

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    try {
      const session = await AuthService.getSession();

      if (session?.user) {
        const user = session.user;
        const mappedUser: User = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name,
        };

        set({
          session,
          user: mappedUser,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({ session: null, user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (e) {
      set({ session: null, user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
