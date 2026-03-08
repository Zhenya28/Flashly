import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore } from '@/store/collectionStore';
import { useAuthStore } from '@/store/authStore';
import { StatusBar } from 'expo-status-bar';
import { Brain, Target, BookOpen, ArrowRight, Clock, Zap, ChevronDown, Layers, CheckCircle, Check, X, Search } from 'lucide-react-native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LearningSkeleton } from '@/components/features/skeletons/LearningSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useMemo } from 'react';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, { FadeIn, FadeOut, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

const WIDGET_IMAGE_HEIGHT = 150;

type DeckSelection = 'all' | string;

export default function StudyHubScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows, isDark);
  const { collections, fetchCollections, isLoading, getCollectionStats } = useCollectionStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeMode, setActiveMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [selectedDeck, setSelectedDeck] = useState<DeckSelection>('all');
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [deckSearchQuery, setDeckSearchQuery] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  // Get selected deck info
  const selectedDeckInfo = useMemo(() => {
    if (selectedDeck === 'all') {
      let totalDue = 0;
      let totalCards = 0;
      collections.forEach(col => {
        const stats = getCollectionStats(col.id);
        totalDue += stats.due;
        totalCards += stats.total;
      });
      return {
        title: 'Wszystkie talie',
        due: totalDue,
        total: totalCards,
      };
    } else {
      const deck = collections.find(c => c.id === selectedDeck);
      if (deck) {
        const stats = getCollectionStats(deck.id);
        return {
          title: deck.title,
          due: stats.due,
          total: stats.total,
        };
      }
      // Fallback to all if deck not found
      return {
        title: 'Wszystkie talie',
        due: 0,
        total: 0,
      };
    }
  }, [selectedDeck, collections, getCollectionStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCollections();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCollections]);

  useFocusEffect(
    useCallback(() => {
      fetchCollections();
    }, [fetchCollections, user?.id])
  );

  const handleStartLearning = () => {
    if (selectedDeck === 'all') {
      // Find first collection with content
      const targetCollection = collections.find(col => {
        const stats = getCollectionStats(col.id);
        return activeMode === 'flashcards' ? stats.due > 0 : stats.total > 0;
      });
      if (targetCollection) {
        if (activeMode === 'quiz') {
          router.push(`/quiz/${targetCollection.id}`);
        } else {
          router.push(`/study/${targetCollection.id}`);
        }
      } else if (collections.length > 0) {
        if (activeMode === 'quiz') {
          router.push(`/quiz/${collections[0].id}`);
        } else {
          router.push(`/study/${collections[0].id}`);
        }
      }
    } else {
      if (activeMode === 'quiz') {
        router.push(`/quiz/${selectedDeck}`);
      } else {
        router.push(`/study/${selectedDeck}`);
      }
    }
  };

  const filteredDecks = useMemo(() => {
    if (!deckSearchQuery.trim()) return collections;
    return collections.filter(c =>
      c.title.toLowerCase().includes(deckSearchQuery.toLowerCase())
    );
  }, [collections, deckSearchQuery]);

  const handleSelectDeck = (deckId: DeckSelection) => {
    Haptics.selectionAsync();
    setSelectedDeck(deckId);
    setShowDeckPicker(false);
    setDeckSearchQuery('');
  };

  if (isLoading && !collections.length && !refreshing) {
    return (
      <GradientBackground variant="subtle">
        <SafeAreaView style={styles.flex} edges={['top']}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <Typography variant="h1" color={Theme.text}>Centrum Nauki</Typography>
              <Typography variant="body" color={Theme.textSecondary}>
                Wybierz tryb i rozpocznij
              </Typography>
            </View>
          </View>
          <LearningSkeleton />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Theme.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <Typography variant="h1" color={Theme.text}>Centrum Nauki</Typography>
              <Typography variant="body" color={Theme.textSecondary}>
                Wybierz tryb i rozpocznij
              </Typography>
            </Animated.View>

            {/* Compact Toggle Bar */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.toggleContainer}>
              <View style={styles.toggleWrapper}>
                <TouchableOpacity
                  style={[styles.toggleButton, activeMode === 'flashcards' && styles.toggleButtonActive]}
                  onPress={() => { Haptics.selectionAsync(); setActiveMode('flashcards'); }}
                  activeOpacity={0.8}
                >
                  <BookOpen size={15} color={activeMode === 'flashcards' ? Theme.primary : Theme.textMuted} />
                  <Typography
                    variant="bodySemi"
                    color={activeMode === 'flashcards' ? Theme.primary : Theme.textMuted}
                    style={{ fontSize: 14 }}
                  >
                    Fiszki
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleButton, activeMode === 'quiz' && styles.toggleButtonActive]}
                  onPress={() => { Haptics.selectionAsync(); setActiveMode('quiz'); }}
                  activeOpacity={0.8}
                >
                  <Target size={15} color={activeMode === 'quiz' ? Theme.primary : Theme.textMuted} />
                  <Typography
                    variant="bodySemi"
                    color={activeMode === 'quiz' ? Theme.primary : Theme.textMuted}
                    style={{ fontSize: 14 }}
                  >
                    Quiz
                  </Typography>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
          {/* Main Mode Widget */}
          <View style={styles.widgetSection}>
            {activeMode === 'flashcards' ? (
              <Animated.View
                key="flashcards-widget"
                entering={FadeIn.duration(280)}
                exiting={FadeOut.duration(200)}
              >
                <View style={styles.modeWidget}>
                  {/* Image with subtle gradient overlay */}
                  <View style={styles.widgetImageContainer}>
                    <Image
                      source={require('@/assets/images/widget-flashcards.png')}
                      style={styles.widgetImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {/* Subtle gradient - smooth fade into card */}
                    <LinearGradient
                      colors={isDark
                        ? ['transparent', 'rgba(26,26,40,0.05)', 'rgba(26,26,40,0.25)', 'rgba(26,26,40,0.55)', Theme.card]
                        : ['transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.55)', '#FFFFFF']}
                      locations={[0, 0.2, 0.45, 0.7, 1]}
                      style={styles.widgetImageOverlay}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.widgetContent}>
                    <Typography variant="h2" color={Theme.text}>
                      Klasyczne Fiszki
                    </Typography>
                    <Typography variant="body" color={Theme.textSecondary} style={styles.widgetDescription}>
                      Ucz się metodą powtórek rozłożonych w czasie.
                    </Typography>

                    {/* Deck Selector */}
                    <TouchableOpacity
                      style={styles.deckSelector}
                      onPress={() => setShowDeckPicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.deckSelectorLeft}>
                        <View style={[styles.deckSelectorIcon, { backgroundColor: Theme.primaryMuted }]}>
                          {selectedDeck === 'all' ? (
                            <Layers size={16} color={Theme.primary} />
                          ) : (
                            <Brain size={16} color={Theme.primary} />
                          )}
                        </View>
                        <View style={styles.deckSelectorText}>
                          <Typography variant="caption" color={Theme.textMuted}>
                            Wybrana talia
                          </Typography>
                          <Typography variant="bodySemi" color={Theme.text} numberOfLines={1}>
                            {selectedDeckInfo.title}
                          </Typography>
                        </View>
                      </View>
                      <ChevronDown size={20} color={Theme.textMuted} />
                    </TouchableOpacity>

                    {/* Stats Section */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: Theme.warningLight }]}>
                          <Clock size={16} color={Theme.warning} strokeWidth={2.5} />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Typography variant="h3" color={Theme.text} style={styles.statNumber}>
                            {selectedDeckInfo.due}
                          </Typography>
                          <Typography variant="caption" color={Theme.textMuted}>
                            do powtórki
                          </Typography>
                        </View>
                      </View>

                      <View style={styles.statDivider} />

                      <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: Theme.primaryMuted }]}>
                          <Layers size={16} color={Theme.primary} strokeWidth={2.5} />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Typography variant="h3" color={Theme.text} style={styles.statNumber}>
                            {selectedDeckInfo.total}
                          </Typography>
                          <Typography variant="caption" color={Theme.textMuted}>
                            wszystkich
                          </Typography>
                        </View>
                      </View>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={handleStartLearning}
                      activeOpacity={0.9}
                      disabled={collections.length === 0}
                    >
                      <LinearGradient
                        colors={[Theme.primary, Theme.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaGradient}
                      >
                        <Zap size={17} color="#FFFFFF" strokeWidth={2.5} />
                        <Typography variant="bodySemi" color="#FFFFFF">
                          Rozpocznij naukę
                        </Typography>
                        <ArrowRight size={17} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                key="quiz-widget"
                entering={FadeIn.duration(280)}
                exiting={FadeOut.duration(200)}
              >
                <View style={styles.modeWidget}>
                  {/* Image with subtle gradient overlay */}
                  <View style={styles.widgetImageContainer}>
                    <Image
                      source={require('@/assets/images/widget-quiz.png')}
                      style={styles.widgetImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {/* Subtle gradient - smooth fade into card */}
                    <LinearGradient
                      colors={isDark
                        ? ['transparent', 'rgba(26,26,40,0.05)', 'rgba(26,26,40,0.25)', 'rgba(26,26,40,0.55)', Theme.card]
                        : ['transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.55)', '#FFFFFF']}
                      locations={[0, 0.2, 0.45, 0.7, 1]}
                      style={styles.widgetImageOverlay}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.widgetContent}>
                    <Typography variant="h2" color={Theme.text}>
                      Tryb Quiz
                    </Typography>
                    <Typography variant="body" color={Theme.textSecondary} style={styles.widgetDescription}>
                      Sprawdź swoją wiedzę odpowiadając na pytania.
                    </Typography>

                    {/* Deck Selector */}
                    <TouchableOpacity
                      style={styles.deckSelector}
                      onPress={() => setShowDeckPicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.deckSelectorLeft}>
                        <View style={[styles.deckSelectorIcon, { backgroundColor: Theme.successLight }]}>
                          {selectedDeck === 'all' ? (
                            <Layers size={16} color={Theme.success} />
                          ) : (
                            <Target size={16} color={Theme.success} />
                          )}
                        </View>
                        <View style={styles.deckSelectorText}>
                          <Typography variant="caption" color={Theme.textMuted}>
                            Wybrany quiz
                          </Typography>
                          <Typography variant="bodySemi" color={Theme.text} numberOfLines={1}>
                            {selectedDeckInfo.title}
                          </Typography>
                        </View>
                      </View>
                      <ChevronDown size={20} color={Theme.textMuted} />
                    </TouchableOpacity>

                    {/* Stats Section */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: Theme.successLight }]}>
                          <CheckCircle size={16} color={Theme.success} strokeWidth={2.5} />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Typography variant="h3" color={Theme.text} style={styles.statNumber}>
                            {selectedDeckInfo.total}
                          </Typography>
                          <Typography variant="caption" color={Theme.textMuted}>
                            pytań
                          </Typography>
                        </View>
                      </View>

                      <View style={styles.statDivider} />

                      <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: Theme.secondaryMuted }]}>
                          <Target size={16} color={Theme.secondary} strokeWidth={2.5} />
                        </View>
                        <View style={styles.statTextContainer}>
                          <Typography variant="h3" color={Theme.text} style={styles.statNumber}>
                            {selectedDeck === 'all' ? collections.length : 1}
                          </Typography>
                          <Typography variant="caption" color={Theme.textMuted}>
                            {(selectedDeck === 'all' ? collections.length : 1) === 1 ? 'quiz' : 'quizów'}
                          </Typography>
                        </View>
                      </View>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={handleStartLearning}
                      activeOpacity={0.9}
                      disabled={collections.length === 0}
                    >
                      <LinearGradient
                        colors={[Theme.success, Theme.successDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaGradient}
                      >
                        <Target size={17} color="#FFFFFF" strokeWidth={2.5} />
                        <Typography variant="bodySemi" color="#FFFFFF">
                          Rozpocznij quiz
                        </Typography>
                        <ArrowRight size={17} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Deck Picker Modal */}
        <Modal
          visible={showDeckPicker}
          transparent
          animationType="fade"
          onRequestClose={() => { setShowDeckPicker(false); setDeckSearchQuery(''); }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => { setShowDeckPicker(false); setDeckSearchQuery(''); }}>
            <Animated.View
              entering={SlideInDown.duration(300)}
              exiting={SlideOutDown.duration(200)}
              style={styles.modalContent}
            >
              <Pressable onPress={e => e.stopPropagation()}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Typography variant="h3" color={Theme.text}>
                    Wybierz talię
                  </Typography>
                  <TouchableOpacity
                    onPress={() => { setShowDeckPicker(false); setDeckSearchQuery(''); }}
                    style={styles.modalClose}
                  >
                    <X size={20} color={Theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Search */}
                {collections.length > 4 && (
                  <View style={styles.modalSearchContainer}>
                    <Search size={16} color={Theme.textMuted} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Szukaj talii..."
                      placeholderTextColor={Theme.textMuted}
                      value={deckSearchQuery}
                      onChangeText={setDeckSearchQuery}
                      autoCorrect={false}
                    />
                  </View>
                )}

                {/* All Decks Option */}
                {!deckSearchQuery.trim() && (
                  <TouchableOpacity
                    style={[
                      styles.deckOption,
                      selectedDeck === 'all' && styles.deckOptionSelected
                    ]}
                    onPress={() => handleSelectDeck('all')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.deckOptionIcon, { backgroundColor: Theme.primaryMuted }]}>
                      <Layers size={18} color={Theme.primary} />
                    </View>
                    <View style={styles.deckOptionText}>
                      <Typography variant="bodySemi" color={Theme.text}>
                        Wszystkie talie
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        {collections.reduce((acc, c) => acc + getCollectionStats(c.id).total, 0)} fiszek łącznie
                      </Typography>
                    </View>
                    {selectedDeck === 'all' && (
                      <View style={styles.checkIcon}>
                        <Check size={16} color={Theme.primary} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Divider */}
                {!deckSearchQuery.trim() && collections.length > 0 && (
                  <View style={styles.modalDivider}>
                    <View style={styles.modalDividerLine} />
                    <Typography variant="caption" color={Theme.textMuted} style={styles.modalDividerText}>
                      lub wybierz konkretną
                    </Typography>
                    <View style={styles.modalDividerLine} />
                  </View>
                )}

                {/* Individual Decks */}
                <ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
                  {filteredDecks.map((deck) => {
                    const stats = getCollectionStats(deck.id);
                    const isSelected = selectedDeck === deck.id;
                    return (
                      <TouchableOpacity
                        key={deck.id}
                        style={[
                          styles.deckOption,
                          isSelected && styles.deckOptionSelected
                        ]}
                        onPress={() => handleSelectDeck(deck.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.deckOptionIcon,
                          { backgroundColor: activeMode === 'flashcards' ? Theme.primaryMuted : Theme.successLight }
                        ]}>
                          {activeMode === 'flashcards' ? (
                            <Brain size={18} color={Theme.primary} />
                          ) : (
                            <Target size={18} color={Theme.success} />
                          )}
                        </View>
                        <View style={styles.deckOptionText}>
                          <Typography variant="bodySemi" color={Theme.text} numberOfLines={1}>
                            {deck.title}
                          </Typography>
                          <Typography variant="caption" color={Theme.textMuted}>
                            {activeMode === 'flashcards'
                              ? `${stats.due} do powtórki · ${stats.total} łącznie`
                              : `${stats.total} pytań`
                            }
                          </Typography>
                        </View>
                        {isSelected && (
                          <View style={styles.checkIcon}>
                            <Check size={16} color={Theme.primary} strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any, shadows: any, isDark: boolean) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: Spacing.xs,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // Compact Toggle Bar
  toggleContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    padding: 3,
    ...shadows.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  toggleButtonActive: {
    backgroundColor: Theme.primaryMuted,
  },

  scrollContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  // Widget Section
  widgetSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modeWidget: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...shadows.md,
    borderWidth: 1,
    borderColor: Theme.borderLight,
  },
  widgetImageContainer: {
    width: '100%',
    height: WIDGET_IMAGE_HEIGHT,
    position: 'relative',
  },
  widgetImage: {
    width: '100%',
    height: '100%',
  },
  widgetImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  widgetContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  widgetDescription: {
    marginTop: 4,
    lineHeight: 22,
  },

  // Deck Selector
  deckSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  deckSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deckSelectorIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckSelectorText: {
    flex: 1,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    lineHeight: 24,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Theme.border,
    marginHorizontal: 8,
  },

  // CTA Button
  ctaButton: {
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Theme.text,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.border,
  },
  modalDividerText: {
    paddingHorizontal: Spacing.sm,
  },
  deckList: {
    maxHeight: 300,
    paddingHorizontal: Spacing.lg,
  },
  deckOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Theme.backgroundAlt,
  },
  deckOptionSelected: {
    backgroundColor: Theme.primaryMuted,
    borderWidth: 1,
    borderColor: Theme.primary,
  },
  deckOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckOptionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
