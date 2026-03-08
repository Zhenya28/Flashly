import { supabase } from '@/lib/supabase';
// import { Database } from '@/types/supabase';

export interface Collection {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_lang: string;
  target_lang: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  flashcards?: { count: number }[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
  collection_id: string;
  created_at: string;
}

export const DatabaseService = {
  // Collections
  async getCollections() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .select('*, flashcards(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createCollection(title: string, description: string, source_lang: string, target_lang: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .insert({
        title,
        description,
        user_id: user.id,
        source_lang,
        target_lang
      })
      .select()
      .single();

    if (error) throw error;
    return data as Collection;
  },

  async createCollectionWithCards(
    title: string, 
    description: string, 
    source_lang: string, 
    target_lang: string,
    cards: { front: string; back: string }[]
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Create Collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .insert({
        title,
        description,
        user_id: user.id,
        source_lang,
        target_lang
      })
      .select()
      .single();

    if (collectionError) throw collectionError;

    // 2. Create Cards if any
    if (cards.length > 0) {
      const cardsData = cards.map(c => ({
        collection_id: collection.id,
        user_id: user.id,
        front: c.front,
        back: c.back
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsData);

      if (cardsError) {
        // Delete the collection since cards failed to create
        await supabase.from('collections').delete().eq('id', collection.id);
        throw new Error(`Nie udało się dodać fiszek: ${cardsError.message}`);
      }
    }

    return collection as Collection;
  },

  async deleteCollection(id: string) {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  // Flashcards
  async getFlashcards(collectionId: string) {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createFlashcard(collectionId: string, front: string, back: string, imageUrl?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        collection_id: collectionId,
        front,
        back,
        image_url: imageUrl,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFlashcard(id: string, front: string, back: string) {
    const { data, error } = await supabase
      .from('flashcards')
      .update({ front, back })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  },
  
  async deleteFlashcard(id: string) {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get collection stats with proper SM-2 mastery calculation
  async getCollectionStats(collectionId: string): Promise<{ total: number; due: number; mastered: number; studied: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { total: 0, due: 0, mastered: 0, studied: 0 };

    const now = new Date().toISOString();

    // Get total flashcards count
    const { count: total } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    // Get flashcard IDs for this collection
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id')
      .eq('collection_id', collectionId);

    const cardIds = flashcards?.map(f => f.id) || [];

    if (cardIds.length === 0) {
      return { total: 0, due: 0, mastered: 0, studied: 0 };
    }

    // Get study logs for these cards
    const { data: studyLogs } = await supabase
      .from('study_logs')
      .select('flashcard_id, interval, next_review_at')
      .eq('user_id', user.id)
      .in('flashcard_id', cardIds);

    const logs = studyLogs || [];

    // Cards with study_logs = studied
    const studied = logs.length;

    // Cards with interval > 21 = mastered
    const mastered = logs.filter(log => log.interval > 21).length;

    // Cards due for review (next_review_at <= now)
    const due = logs.filter(log => !log.next_review_at || new Date(log.next_review_at) <= new Date(now)).length;

    return {
      total: total || 0,
      due,
      mastered,
      studied
    };
  },

  // Get stats for all collections at once (optimized)
  async getAllCollectionStats(): Promise<Record<string, { total: number; due: number; mastered: number; studied: number }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const now = new Date().toISOString();

    // Get all flashcards with their collection_id
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, collection_id')
      .eq('user_id', user.id);

    if (!flashcards || flashcards.length === 0) return {};

    const cardIds = flashcards.map(f => f.id);

    // Get all study logs for user's cards
    const { data: studyLogs } = await supabase
      .from('study_logs')
      .select('flashcard_id, interval, next_review_at')
      .eq('user_id', user.id)
      .in('flashcard_id', cardIds);

    const logs = studyLogs || [];

    // Create a map of flashcard_id -> study_log
    const logMap = new Map(logs.map(log => [log.flashcard_id, log]));

    // Group by collection and calculate stats
    const statsMap: Record<string, { total: number; due: number; mastered: number; studied: number }> = {};

    flashcards.forEach(card => {
      if (!statsMap[card.collection_id]) {
        statsMap[card.collection_id] = { total: 0, due: 0, mastered: 0, studied: 0 };
      }

      statsMap[card.collection_id].total++;

      const log = logMap.get(card.id);
      if (log) {
        statsMap[card.collection_id].studied++;

        if (log.interval > 21) {
          statsMap[card.collection_id].mastered++;
        }

        if (!log.next_review_at || new Date(log.next_review_at) <= new Date(now)) {
          statsMap[card.collection_id].due++;
        }
      }
    });

    return statsMap;
  }
};
