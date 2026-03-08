/**
 * Collection Store - Uses Supabase directly for collection and flashcard management
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { StudyService } from '@/services/study';
import { GeminiService } from '@/services/gemini';
import { useStudyStore } from './studyStore';

export interface CollectionData {
  id: string;
  title: string;
  description: string | null;
  source_lang: string;
  target_lang: string;
  is_public: boolean;
  category_id?: string;
  downloads_count?: number;
  flashcard_count?: number;

  created_at: string;
  updated_at: string;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  sort_order: number;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
  collection_id: string;
  created_at: string;
}

export interface CollectionStats {
  total: number;
  due: number;
  mastered: number;
  studied: number;
  newCards: number;
}

// Cache staleness threshold (5 seconds)
const CACHE_TTL_MS = 5000;

interface CollectionState {
  collections: CollectionData[];
  categories: CategoryData[];
  publicCollections: CollectionData[];
  cards: FlashcardData[];
  collectionStats: Record<string, CollectionStats>;
  isLoading: boolean;
  lastFetchedAt: number | null; // Timestamp for cache staleness

  // Actions
  fetchCollections: (forceRefresh?: boolean) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPublicCollections: (categoryId?: string) => Promise<void>;
  addCollection: (title: string, description: string, source_lang: string, target_lang: string) => Promise<void>;
  cloneCollection: (collectionId: string) => Promise<void>;
  addCollectionWithCards: (title: string, description: string, source_lang: string, target_lang: string, cards: { front: string; back: string }[]) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Pick<CollectionData, 'title' | 'description'>>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  fetchCards: (collectionId: string) => Promise<void>;
  generateFlashcardsFromAI: (base64File: string, mimeType?: string, sourceLang?: string, targetLang?: string) => Promise<{ front: string; back: string }[]>;
  generateFlashcardsFromPDF: (base64PDF: string, sourceLang?: string, targetLang?: string) => Promise<{ front: string; back: string }[]>;
  addCard: (collectionId: string, front: string, back: string) => Promise<void>;
  addCardsBatch: (collectionId: string, cards: { front: string; back: string }[]) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  updateFlashcard: (cardId: string, front: string, back: string) => Promise<void>;

  getCollectionStats: (id: string) => CollectionStats;
  refreshStats: () => Promise<void>;
  invalidateCache: () => void;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  categories: [],
  publicCollections: [],
  cards: [],
  collectionStats: {},
  isLoading: false,
  lastFetchedAt: null,

  /**
   * Invalidate cache to force refresh on next fetch
   */
  invalidateCache: () => {
    set({ lastFetchedAt: null });
  },

  /**
   * Generate flashcards from image using Gemini Vision API
   */
  generateFlashcardsFromAI: async (base64File, mimeType = 'image/jpeg', sourceLang = 'EN', targetLang = 'PL') => {
    try {
      set({ isLoading: true });

      const cards = await GeminiService.generateCardsFromImage(base64File, mimeType, sourceLang, targetLang);

      set({ isLoading: false });
      return cards;
    } catch (error) {
      console.error('Error generating AI flashcards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateFlashcardsFromPDF: async (base64PDF, sourceLang = 'EN', targetLang = 'PL') => {
    try {
      set({ isLoading: true });
      const cards = await GeminiService.generateCardsFromPDF(base64PDF, sourceLang, targetLang);
      set({ isLoading: false });
      return cards;
    } catch (error) {
      console.error('Error generating flashcards from PDF:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Fetch all collections from Supabase
   * Uses batched stats query (2 API calls instead of N*4)
   * With cache to prevent unnecessary refetches
   */
  fetchCollections: async (forceRefresh = false) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const { isLoading, lastFetchedAt, collections } = get();

    // Prevent concurrent fetches
    if (isLoading) return;

    // Use cache if data is fresh (unless force refresh)
    if (!forceRefresh && lastFetchedAt && collections.length > 0) {
      const age = Date.now() - lastFetchedAt;
      if (age < CACHE_TTL_MS) {
        return; // Data is fresh, skip fetch
      }
    }

    try {
      set({ isLoading: true });

      // Fetch collections and stats in parallel (3 API calls total instead of N*4+1)
      const [collectionsResult, allStats] = await Promise.all([
        supabase
          .from('collections')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        StudyService.getAllCollectionStats(userId),
      ]);

      if (collectionsResult.error) throw collectionsResult.error;

      // Map stats to CollectionStats format
      const stats: Record<string, CollectionStats> = {};
      (collectionsResult.data || []).forEach((c) => {
        const collectionStats = allStats[c.id] || { total: 0, due: 0, newCards: 0 };
        stats[c.id] = {
          total: collectionStats.total,
          due: collectionStats.due,
          newCards: collectionStats.newCards,
          studied: collectionStats.total - collectionStats.newCards,
          mastered: 0,
        };
      });

      set({
        collections: collectionsResult.data || [],
        collectionStats: stats,
        isLoading: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Fetch all categories
   */
  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      set({ categories: data || [] });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  /**
   * Fetch public collections (optionally filtered by category)
   */
  fetchPublicCollections: async (categoryId) => {
    try {
      set({ isLoading: true });
      let query = supabase
        .from('collections')
        .select('*, flashcards(count)')
        .eq('is_public', true)
        .order('downloads_count', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map flashcard count from aggregation to flat property
      const collectionsWithCount = (data || []).map((c: any) => ({
        ...c,
        flashcard_count: c.flashcards?.[0]?.count || 0,
        flashcards: undefined, // Remove nested object
      }));
      
      set({ publicCollections: collectionsWithCount, isLoading: false });
    } catch (error) {
      console.error('Error fetching public collections:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Refresh stats for all collections (uses batched query)
   */
  refreshStats: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    try {
      const { collections } = get();
      const allStats = await StudyService.getAllCollectionStats(userId);

      const stats: Record<string, CollectionStats> = {};
      collections.forEach((c) => {
        const collectionStats = allStats[c.id] || { total: 0, due: 0, newCards: 0 };
        stats[c.id] = {
          total: collectionStats.total,
          due: collectionStats.due,
          newCards: collectionStats.newCards,
          studied: collectionStats.total - collectionStats.newCards,
          mastered: 0,
        };
      });

      set({ collectionStats: stats, lastFetchedAt: Date.now() });
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  },

  /**
   * Create a new collection
   */
  addCollection: async (title, description, source_lang, target_lang) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });
      
      const { error } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          title,
          description,
          source_lang,
          target_lang,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await get().fetchCollections();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error creating collection:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Clone a public collection to user's private library
   */
  cloneCollection: async (collectionId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });

      // 1. Fetch original collection details
      const { data: originalCollection, error: fetchError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();
      
      if (fetchError || !originalCollection) throw new Error('Collection not found');

      // 2. Fetch original flashcards
      const { data: originalCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('front, back, image_url')
        .eq('collection_id', collectionId);

      if (cardsError) throw cardsError;

      // 3. Create new private collection
      const { data: newCollection, error: createError } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          title: originalCollection.title,
          description: originalCollection.description,
          source_lang: originalCollection.source_lang,
          target_lang: originalCollection.target_lang,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      // 4. Copy flashcards
      if (originalCards && originalCards.length > 0) {
        const flashcardsToInsert = originalCards.map(card => ({
          collection_id: newCollection.id,
          user_id: userId,
          front: card.front,
          back: card.back,
          image_url: card.image_url,
          created_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert);

        if (insertError) throw insertError;
      }

      // 5. Increment download count (fire and forget)
      try {
        const { error } = await supabase.rpc('increment_downloads', { collection_id_param: collectionId });
        if (error) throw error;
      } catch (e) {
        // Fallback if RPC doesn't exist yet, simple update
        await supabase
          .from('collections')
          .update({ downloads_count: (originalCollection.downloads_count || 0) + 1 })
          .eq('id', collectionId);
      }

      // Refresh collections
      await get().fetchCollections(true);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error cloning collection:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Create a collection with initial cards
   */
  addCollectionWithCards: async (title, description, source_lang, target_lang, cards) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });
      
      // Create collection
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          title,
          description,
          source_lang,
          target_lang,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Create flashcards
      if (cards.length > 0 && collection) {
        const flashcardsToInsert = cards.map(card => ({
          collection_id: collection.id,
          user_id: userId,
          front: card.front,
          back: card.back,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: cardsError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert);

        if (cardsError) throw cardsError;
      }

      await get().fetchCollections();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error creating collection with cards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Update a collection (title, description)
   */
  updateCollection: async (id, updates) => {
    const { collections } = get();
    const original = collections.find(c => c.id === id);
    if (!original) return;

    // Optimistic update
    set({
      collections: collections.map(c =>
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    });

    try {
      const { error } = await supabase
        .from('collections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // Rollback
      set({ collections: collections });
      throw error;
    }
  },

  /**
   * Delete a collection
   */
  deleteCollection: async (id) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not authenticated');

      // First, get all flashcard IDs in this collection
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('collection_id', id);

      // Delete study_logs for these flashcards (if any)
      if (flashcards && flashcards.length > 0) {
        const flashcardIds = flashcards.map(f => f.id);
        const { error: logsError } = await supabase
          .from('study_logs')
          .delete()
          .in('flashcard_id', flashcardIds)
          .eq('user_id', userId);

        if (logsError) {
          console.error('Error deleting study logs:', logsError);
          // Continue anyway - logs might not exist
        }
      }

      // Delete all flashcards
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('collection_id', id);

      if (flashcardsError) throw flashcardsError;

      // Delete collection
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;

      // Optimistic update
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  },

  /**
   * Fetch flashcards for a collection
   */
  fetchCards: async (collectionId) => {
    try {
      set({ isLoading: true });
      
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ cards: cards || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching cards:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Create a new flashcard
   */
  addCard: async (collectionId, front, back) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('flashcards')
        .insert({
          collection_id: collectionId,
          user_id: userId,
          front,
          back,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await get().fetchCards(collectionId);
      await get().refreshStats();
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  },
  
  /**
   * Batch create flashcards
   */
  addCardsBatch: async (collectionId, cards) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });
      
      const flashcardsToInsert = cards.map(card => ({
        collection_id: collectionId,
        user_id: userId,
        front: card.front,
        back: card.back,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert in batches (Supabase limit ~1000 rows per insert)
      const BATCH_SIZE = 500;
      for (let i = 0; i < flashcardsToInsert.length; i += BATCH_SIZE) {
        const batch = flashcardsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('flashcards')
          .insert(batch);
        if (error) throw error;
      }

      await get().fetchCards(collectionId);
      await get().refreshStats();

      // Force study session refresh if active for this collection
      const studyStore = useStudyStore.getState();
      if (studyStore.sessionId === collectionId) {
        studyStore.resetSession();
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error batch creating cards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Update a flashcard
   */
  updateFlashcard: async (cardId, front, back) => {
    const { cards } = get();
    const originalCards = [...cards];

    // Optimistic update
    set({
      cards: cards.map((c) =>
        c.id === cardId ? { ...c, front, back } : c
      ),
    });

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ front, back, updated_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;
      
      // Force study session refresh if active for this card's collection
      // (Optimization: we could find collection ID, but simple reset is safer)
      useStudyStore.getState().resetSession();
    } catch (error) {
      console.error('Failed to update card:', error);
      set({ cards: originalCards });
      throw error;
    }
  },

  /**
   * Delete a flashcard
   */
  deleteCard: async (cardId) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Delete study_logs for this card first
      const { error: logsError } = await supabase
        .from('study_logs')
        .delete()
        .eq('flashcard_id', cardId)
        .eq('user_id', userId);

      if (logsError) throw logsError;

      // Delete the flashcard
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      // Optimistic update
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== cardId),
      }));

      await get().refreshStats();

      // FORCE RESET STUDY SESSION
      useStudyStore.getState().resetSession();
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  },

  /**
   * Get stats for a collection
   */
  getCollectionStats: (id) => {
    const state = get();
    const stats = state.collectionStats[id];
    if (stats) {
      return stats;
    }
    return { total: 0, due: 0, mastered: 0, studied: 0, newCards: 0 };
  },
}));
