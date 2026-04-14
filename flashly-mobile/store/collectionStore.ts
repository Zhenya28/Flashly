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

const CACHE_TTL_MS = 5000;

interface CollectionState {
  collections: CollectionData[];
  categories: CategoryData[];
  publicCollections: CollectionData[];
  cards: FlashcardData[];
  collectionStats: Record<string, CollectionStats>;
  isLoading: boolean;
  lastFetchedAt: number | null;

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

  invalidateCache: () => {
    set({ lastFetchedAt: null });
  },

  generateFlashcardsFromAI: async (base64File, mimeType = 'image/jpeg', sourceLang = 'EN', targetLang = 'PL') => {
    try {
      set({ isLoading: true });
      const cards = await GeminiService.generateCardsFromImage(base64File, mimeType, sourceLang, targetLang);
      set({ isLoading: false });
      return cards;
    } catch (error) {
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
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCollections: async (forceRefresh = false) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const { isLoading, lastFetchedAt, collections } = get();
    if (isLoading) return;

    if (!forceRefresh && lastFetchedAt && collections.length > 0) {
      const age = Date.now() - lastFetchedAt;
      if (age < CACHE_TTL_MS) return;
    }

    try {
      set({ isLoading: true });

      const [collectionsResult, allStats] = await Promise.all([
        supabase
          .from('collections')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        StudyService.getAllCollectionStats(userId),
      ]);

      if (collectionsResult.error) throw collectionsResult.error;

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
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      set({ categories: data || [] });
    } catch (error) {
    }
  },

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

      const collectionsWithCount = (data || []).map((c: any) => ({
        ...c,
        flashcard_count: c.flashcards?.[0]?.count || 0,
        flashcards: undefined,
      }));

      set({ publicCollections: collectionsWithCount, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

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
    }
  },

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
      set({ isLoading: false });
      throw error;
    }
  },

  cloneCollection: async (collectionId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });

      const { data: originalCollection, error: fetchError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (fetchError || !originalCollection) throw new Error('Collection not found');

      const { data: originalCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('front, back, image_url')
        .eq('collection_id', collectionId);

      if (cardsError) throw cardsError;

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

      // Increment download count
      try {
        const { error } = await supabase.rpc('increment_downloads', { collection_id_param: collectionId });
        if (error) throw error;
      } catch (e) {
        await supabase
          .from('collections')
          .update({ downloads_count: (originalCollection.downloads_count || 0) + 1 })
          .eq('id', collectionId);
      }

      await get().fetchCollections(true);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addCollectionWithCards: async (title, description, source_lang, target_lang, cards) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      set({ isLoading: true });

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
      set({ isLoading: false });
      throw error;
    }
  },

  updateCollection: async (id, updates) => {
    const { collections } = get();
    const original = collections.find(c => c.id === id);
    if (!original) return;

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
      set({ collections: collections });
      throw error;
    }
  },

  deleteCollection: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id')
      .eq('collection_id', id);

    if (flashcards && flashcards.length > 0) {
      const flashcardIds = flashcards.map(f => f.id);
      await supabase
        .from('study_logs')
        .delete()
        .in('flashcard_id', flashcardIds)
        .eq('user_id', userId);
    }

    const { error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('collection_id', id);

    if (flashcardsError) throw flashcardsError;

    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
  },

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
      set({ isLoading: false });
    }
  },

  addCard: async (collectionId, front, back) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

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
  },

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

      const studyStore = useStudyStore.getState();
      if (studyStore.sessionId === collectionId) {
        studyStore.resetSession();
      }

      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateFlashcard: async (cardId, front, back) => {
    const { cards } = get();
    const originalCards = [...cards];

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
      useStudyStore.getState().resetSession();
    } catch (error) {
      set({ cards: originalCards });
      throw error;
    }
  },

  deleteCard: async (cardId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error: logsError } = await supabase
      .from('study_logs')
      .delete()
      .eq('flashcard_id', cardId)
      .eq('user_id', userId);

    if (logsError) throw logsError;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    set((state) => ({
      cards: state.cards.filter((c) => c.id !== cardId),
    }));

    await get().refreshStats();
    useStudyStore.getState().resetSession();
  },

  getCollectionStats: (id) => {
    const state = get();
    return state.collectionStats[id] || { total: 0, due: 0, mastered: 0, studied: 0, newCards: 0 };
  },
}));
