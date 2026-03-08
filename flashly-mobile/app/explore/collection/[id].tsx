import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore } from '@/store/collectionStore';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Download, Check, BookOpen, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { ExploreDetailSkeleton } from '@/components/features/skeletons/ExploreDetailSkeleton';
import { FlashcardListItem } from '@/components/features/shared/FlashcardListItem';
import { useTheme } from '@/hooks/useTheme';

// Fetch collection + sample cards
async function fetchCollectionDetails(id: string) {
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('*, flashcards(count)')
    .eq('id', id)
    .single();

  if (colError) throw colError;

  const { data: cards, error: cardsError } = await supabase
    .from('flashcards')
    .select('id, front, back')
    .eq('collection_id', id)
    .limit(10);

  if (cardsError) throw cardsError;

  return {
    collection: {
      ...collection,
      flashcard_count: collection.flashcards?.[0]?.count || 0,
    },
    cards: cards || []
  };
}

export default function ExploreCollectionScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cloneCollection } = useCollectionStore();

  const [data, setData] = useState<{ collection: any; cards: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchCollectionDetails(id);
        setData(result);
      } catch (e) {
        console.error(e);
        Alert.alert('Błąd', 'Nie udało się załadować kolekcji.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleClone = useCallback(async () => {
    if (cloning || downloaded || !data) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCloning(true);

    try {
      await cloneCollection(data.collection.id);
      setDownloaded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sukces', 'Zestaw dodano do Twojej biblioteki!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Błąd', 'Nie udało się pobrać zestawu.');
    } finally {
      setCloning(false);
    }
  }, [cloning, downloaded, data, cloneCollection]);

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: Theme.background }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: Theme.backgroundAlt }]}>
              <ArrowLeft size={20} color={Theme.text} />
            </TouchableOpacity>
          </View>
          <ExploreDetailSkeleton />
        </SafeAreaView>
      </>
    );
  }

  if (!data) return null;

  const { collection, cards } = data;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero Gradient Header */}
      <LinearGradient
        colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <Animated.View entering={FadeIn.duration(500)} style={styles.heroContent}>
          <Typography variant="h1" color="#FFFFFF" style={styles.heroTitle}>
            {collection.title}
          </Typography>
          {collection.description && (
            <Typography variant="body" color="rgba(255,255,255,0.85)" style={styles.heroDesc}>
              {collection.description}
            </Typography>
          )}
        </Animated.View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.statsRow}>
          <View style={styles.statBadge}>
            <BookOpen size={16} color={Theme.primary} style={{ marginBottom: 4 }} />
            <Typography variant="h3" color={Theme.text}>{collection.flashcard_count || 0}</Typography>
            <Typography variant="caption" color={Theme.textSecondary}>Fiszek</Typography>
          </View>
          <View style={styles.statBadge}>
            <Globe size={16} color={Theme.primary} style={{ marginBottom: 4 }} />
            <Typography variant="h3" color={Theme.text}>{collection.source_lang}</Typography>
            <Typography variant="caption" color={Theme.textSecondary}>Źródło</Typography>
          </View>
          <View style={styles.statBadge}>
            <Globe size={16} color={Theme.primary} style={{ marginBottom: 4 }} />
            <Typography variant="h3" color={Theme.text}>{collection.target_lang}</Typography>
            <Typography variant="caption" color={Theme.textSecondary}>Cel</Typography>
          </View>
        </Animated.View>

        {/* Download Button */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <TouchableOpacity
            onPress={handleClone}
            disabled={cloning || downloaded}
            activeOpacity={0.9}
            style={[
              styles.downloadButton,
              downloaded && styles.downloadButtonSuccess
            ]}
          >
            {cloning ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : downloaded ? (
              <Animated.View entering={ZoomIn.springify()} style={styles.buttonContent}>
                <Check size={20} color="#FFFFFF" strokeWidth={3} />
                <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 18 }}>
                  Pobrano
                </Typography>
              </Animated.View>
            ) : (
              <View style={styles.buttonContent}>
                <Download size={20} color="#FFFFFF" />
                <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 18 }}>
                  Pobierz zestaw
                </Typography>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Cards Preview */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.cardsSection}>
          <View style={styles.cardsSectionHeader}>
            <Typography variant="h3" color={Theme.text}>Podgląd fiszek</Typography>
            <Typography variant="caption" color={Theme.textMuted}>
              {cards.length} z {collection.flashcard_count || 0}
            </Typography>
          </View>

          {cards.map((card, index) => (
            <FlashcardListItem
              key={card.id}
              front={card.front}
              back={card.back}
              sourceLang={collection.source_lang || 'EN'}
              variant="readonly"
              animationDelay={350 + index * 60}
            />
          ))}

          {cards.length === 0 && (
            <View style={styles.emptyState}>
              <Typography variant="body" color={Theme.textMuted}>
                Brak podglądu fiszek
              </Typography>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  heroGradient: {
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  heroTitle: {
    fontSize: 30,
    letterSpacing: -0.5,
  },
  heroDesc: {
    marginTop: 8,
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
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
    ...shadows.sm,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    marginBottom: Spacing.xl,
    backgroundColor: Theme.primary,
    ...shadows.glow,
  },
  downloadButtonSuccess: {
    backgroundColor: Theme.success,
    shadowColor: Theme.success,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
