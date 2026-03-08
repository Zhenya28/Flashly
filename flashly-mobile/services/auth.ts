import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession(); // Handle redirect on web if needed

export const AuthService = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    return data.session;
  },

  async signInWithGoogle() {
    const redirectUrl = makeRedirectUri({
      scheme: 'flashly',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false, // Let Supabase handle the redirect
      },
    });

    if (error) throw error;
    
    // For native, Supabase SDK might open the browser automatically if skipBrowserRedirect is false (default).
    // However, keeping consistent control often implies using openAuthSessionAsync if we wanted full manual control.
    // The Supabase React Native docs usually recommend:
    
    if (data.url) {
      // If we needed to open manually:
      // const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      // But Supabase JS client handles this if we don't pass skipBrowserRedirect: true? 
      // Actually, in React Native with Supabase JS v2, we often handle the URL opening manually 
      // OR we just let the deep link come back and Supabase handles the session via onAuthStateChange.
      
      // Let's implement the standard manual flow for reliability:
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        // Extract tokens from URL if needed, but usually supabase.auth.getSession() picks it up 
        // if the deep link listener is set up correctly in App or index. 
        // Or we can parse the session from the URL.
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        
        if (params.access_token && params.refresh_token) {
           const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
           });
           if (sessionError) throw sessionError;
           return { session: sessionData.session, user: sessionData.user };
        }
      }
    }
    
    return { session: null, user: null }; // Or handle cancellation
  },

  async loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { session: data.session, user: data.user };
  },

  async registerWithEmail(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) throw error;
    // Note: If email confirmation is enabled, session might be null here
    return { session: data.session, user: data.user };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};

