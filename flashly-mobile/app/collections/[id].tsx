import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore } from '@/store/collectionStore';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Plus, Play, MoreVertical, X, Zap } from 'lucide-react-native';
import EmptyNote from '@/components/illustrations/EmptyNote';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CollectionDetailSkeleton } from '@/components/features/skeletons/CollectionDetailSkeleton';
import { FlashcardListItem } from '@/components/features/shared/FlashcardListItem';
import { FlashcardEditModal } from '@/components/features/shared/FlashcardEditModal';
import { CollectionActionMenu } from '@/components/features/shared/CollectionActionMenu';
import { useTheme } from '@/hooks/useTheme';
import { StudyService } from '@/services/study';
import { supabase } from '@/lib/supabase';
import type { FSRSCard } from '@/lib/fsrs';
import { calculateCardMastery, calculateCollectionMastery } from '@/lib/mastery';
import { CollectionMasterySummary } from '@/components/features/stats/CollectionMasterySummary';
import { CardStatsSheet } from '@/components/features/stats/CardStatsSheet';

export default function CollectionDetailsScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const { id } = useLocalSearchParams();
  const { collections, cards, fetchCards, isLoading, deleteCard, updateFlashcard, deleteCollection, updateCollection, getCollectionStats, refreshStats } = useCollectionStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<{ id: string, front: string, back: string } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [cardFsrsMap, setCardFsrsMap] = useState<Map<string, FSRSCard>>(new Map());
  const [statsCardId, setStatsCardId] = useState<string | null>(null);

  const collection = collections.find(c => c.id === id);

  useEffect(() => {
    if (typeof id === 'string') {
      fetchCards(id);
    }
  }, [id, fetchCards]);

  // Fetch FSRS data for mastery display
  const fetchFsrsData = useCallback(async () => {
    if (typeof id !== 'string') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const map = await StudyService.getCollectionCardStats(id, user.id);
      setCardFsrsMap(map);
    } catch (e) {
      console.warn('Failed to fetch FSRS data:', e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      fetchFsrsData();
    }, [refreshStats, fetchFsrsData])
  );

  const collectionMastery = useMemo(
    () => calculateCollectionMastery(cardFsrsMap),
    [cardFsrsMap]
  );

  // Card selected for stats sheet
  const statsCard = statsCardId ? cards.find(c => c.id === statsCardId) : null;
  const statsFsrsCard = statsCardId ? cardFsrsMap.get(statsCardId) : undefined;

  const stats = typeof id === 'string' ? getCollectionStats(id) : { total: 0, due: 0, newCards: 0, studied: 0, mastered: 0 };
  const cardsToStudy = stats.due + stats.newCards;

  // Edit collection name
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const handleEditCollectionName = () => {
    setMenuVisible(false);
    setEditNameValue(collection?.title || '');
    setEditNameVisible(true);
  };

  const handleSaveCollectionName = async () => {
    if (!editNameValue.trim() || typeof id !== 'string') return;
    setEditNameVisible(false);
    try {
      await updateCollection(id, { title: editNameValue.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zmienić nazwy.');
    }
  };

  const handleDeleteCollection = () => {
    setMenuVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Usuń całą kolekcję",
      "Czy na pewno chcesz usunąć tę kolekcję i wszystkie jej fiszki? Tej operacji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń kolekcję",
          style: "destructive",
          onPress: async () => {
            if (typeof id === 'string') {
              await deleteCollection(id);
              router.replace('/(tabs)/collections');
            }
          }
        }
      ]
    );
  };

  const handleDeleteCard = async (cardId: string) => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
     Alert.alert(
       "Usuń fiszkę",
       "Czy na pewno chcesz usunąć tę fiszkę?",
       [
         { text: "Anuluj", style: "cancel" },
         { text: "Usuń", style: "destructive", onPress: () => deleteCard(cardId) }
       ]
     );
  };

  const openEditModal = (card: any) => {
    setEditingCard({ id: card.id, front: card.front, back: card.back });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (cardId: string, front: string, back: string) => {
    await updateFlashcard(cardId, front, back);
  };

  if (!collection) {
     return (
        <View style={styles.container}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView edges={['top']}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                  <ArrowLeft size={20} color={Theme.text} />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
              </View>
            </SafeAreaView>
            <CollectionDetailSkeleton />
        </View>
     );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <SafeAreaView edges={['top']}>
         <View style={styles.header}>
             <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                 <ArrowLeft size={20} color={Theme.text} />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconButton}>
                 <MoreVertical size={20} color={Theme.text} />
             </TouchableOpacity>
         </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {/* Collection Info */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.collectionInfo}>
              <Typography variant="h1" color={Theme.text} style={{ fontSize: 32 }}>
                {collection.title}
              </Typography>
              <Typography variant="body" color={Theme.textSecondary} style={styles.description}>
                {collection.description || 'Brak opisu'}
              </Typography>

              <View style={styles.statsRow}>
                  <View style={styles.statBadge}>
                      <Typography variant="h3" color={Theme.text}>{cards.length}</Typography>
                      <Typography variant="caption" color={Theme.textSecondary}>Fiszek</Typography>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: Theme.successLight, borderColor: Theme.success + '20' }]}>
                      <Typography variant="h3" color={Theme.success}>{cardsToStudy}</Typography>
                      <Typography variant="caption" color={Theme.textSecondary}>Do nauki</Typography>
                  </View>
              </View>

              {/* Mastery Summary */}
              {cardFsrsMap.size > 0 && (
                <View style={{ marginTop: 16 }}>
                  <CollectionMasterySummary collectionMastery={collectionMastery} />
                </View>
              )}

              {/* Main Action */}
              <TouchableOpacity
                onPress={() => router.push(`/study/${collection.id}`)}
                disabled={cardsToStudy === 0}
                activeOpacity={0.9}
                style={{
                    marginTop: 24,
                    shadowColor: Theme.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 10,
                    opacity: cardsToStudy === 0 ? 0.5 : 1
                }}
              >
                 <LinearGradient
                    colors={[Theme.primary, Theme.primaryDark]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.studyButton}
                 >
                     <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                     <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 18 }}>
                       Ucz się teraz
                     </Typography>
                 </LinearGradient>
              </TouchableOpacity>
          </Animated.View>

          {/* Cards List */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.cardsSection}>
              <View style={styles.cardsSectionHeader}>
                  <Typography variant="h3" color={Theme.text}>Fiszki</Typography>
                  <View style={styles.cardsSectionActions}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/cards/ai-import', params: { collectionId: id as string, sourceLang: collection.source_lang, targetLang: collection.target_lang } })}
                      style={styles.aiImportLink}
                    >
                      <Zap size={14} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>AI Import</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/cards/create', params: { collectionId: id } })}>
                        <Typography variant="bodySemi" color={Theme.primary}>+ Dodaj nową</Typography>
                    </TouchableOpacity>
                  </View>
              </View>

              {cards.map((card) => {
                  const fsrsCard = cardFsrsMap.get(card.id);
                  const mastery = fsrsCard ? calculateCardMastery(fsrsCard) : undefined;
                  const cardState = fsrsCard?.state;
                  return (
                    <FlashcardListItem
                      key={card.id}
                      front={card.front}
                      back={card.back}
                      sourceLang={collection.source_lang}
                      variant="default"
                      onEdit={() => openEditModal(card)}
                      onDelete={() => handleDeleteCard(card.id)}
                      mastery={mastery}
                      cardState={cardState}
                      onShowStats={() => setStatsCardId(card.id)}
                    />
                  );
              })}

              {cards.length === 0 && !isLoading && (
                  <View style={styles.emptyState}>
                      <View style={{ marginBottom: -50, marginTop: -10 }}>
                          <EmptyNote width={260} height={260} />
                      </View>
                      <Typography variant="h3" color={Theme.text} style={{ marginTop: 0, marginBottom: 8 }}>
                          Pusta kolekcja
                      </Typography>
                      <Typography variant="body" color={Theme.textMuted} align="center" style={{ maxWidth: 260, marginBottom: 20 }}>
                        Nie dodałeś jeszcze żadnych fiszek. Dodaj pierwszą, aby zacząć naukę!
                      </Typography>
                      <View style={styles.emptyStateActions}>
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/cards/create', params: { collectionId: id } })}
                          style={styles.emptyStatePrimary}
                          activeOpacity={0.7}
                        >
                          <Plus size={18} color="#FFFFFF" />
                          <Typography variant="bodySemi" color="#FFFFFF">Dodaj fiszkę</Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/cards/ai-import', params: { collectionId: id as string, sourceLang: collection.source_lang, targetLang: collection.target_lang } })}
                          style={styles.emptyStateSecondary}
                          activeOpacity={0.7}
                        >
                          <Zap size={18} color={Theme.primary} />
                          <Typography variant="bodySemi" color={Theme.primary}>AI Import</Typography>
                        </TouchableOpacity>
                      </View>
                  </View>
              )}
          </Animated.View>
      </ScrollView>

      {/* Floating Add Button */}
      {cards.length > 0 && (
          <View style={styles.fabContainer}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/cards/create', params: { collectionId: id } })}
                style={styles.fab}
                activeOpacity={0.9}
              >
                  <Plus size={32} color="#FFFFFF" />
              </TouchableOpacity>
          </View>
      )}

      {/* Edit Flashcard Modal */}
      <FlashcardEditModal
        visible={editModalVisible}
        onClose={() => { setEditModalVisible(false); setEditingCard(null); }}
        card={editingCard}
        sourceLang={collection.source_lang}
        targetLang={collection.target_lang}
        onSave={handleSaveEdit}
      />

      {/* Collection Action Menu */}
      <CollectionActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEditName={handleEditCollectionName}
        onDeleteCollection={handleDeleteCollection}
      />

      {/* Card Stats Sheet */}
      {statsCard && statsFsrsCard && (
        <CardStatsSheet
          visible={!!statsCardId}
          onClose={() => setStatsCardId(null)}
          front={statsCard.front}
          back={statsCard.back}
          fsrsCard={statsFsrsCard}
        />
      )}

      {/* EDIT NAME MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editNameVisible}
        onRequestClose={() => setEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editNameOverlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setEditNameVisible(false)} />
          <View style={styles.editNameContent}>
            <View style={styles.editNameHeader}>
              <Typography variant="h3" color={Theme.text}>Zmień nazwę</Typography>
              <TouchableOpacity onPress={() => setEditNameVisible(false)} style={styles.iconButton}>
                <X size={24} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                value={editNameValue}
                onChangeText={setEditNameValue}
                style={styles.input}
                placeholderTextColor={Theme.textMuted}
                placeholder="Nazwa kolekcji..."
                autoFocus
                selectTextOnFocus
              />
            </View>
            <TouchableOpacity
              onPress={handleSaveCollectionName}
              style={[styles.saveButton, !editNameValue.trim() && { opacity: 0.5 }]}
              disabled={!editNameValue.trim()}
              activeOpacity={0.9}
            >
              <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 16 }}>
                Zapisz
              </Typography>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  collectionInfo: {
    marginTop: 10,
    marginBottom: 32,
  },
  description: {
    marginTop: 8,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  statBadge: {
    flex: 1,
    backgroundColor: Theme.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  cardsSection: {
    flex: 1,
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardsSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiImportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emptyStateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyStatePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // Edit Name modal styles
  editNameOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  editNameContent: {
    backgroundColor: Theme.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  editNameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: Theme.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 16,
  },
  input: {
    color: Theme.text,
    fontSize: 16,
    height: 50,
  },
  saveButton: {
    backgroundColor: Theme.success,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
});
