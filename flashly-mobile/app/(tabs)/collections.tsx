import { View, RefreshControl, Alert, TextInput, StyleSheet, ScrollView } from 'react-native';

import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore, CollectionData } from '@/store/collectionStore';
import { FlashList } from '@shopify/flash-list';
import { CollectionCard } from '@/components/features/collections/CollectionCard';
import { CollectionsSkeleton } from '@/components/features/skeletons/CollectionsSkeleton';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Plus, Search, Sparkles, Compass, X, Zap } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Spacing, Radius } from '@/constants/Colors';
import EmptyBox from '@/components/illustrations/EmptyBox';
import SearchLoop from '@/components/illustrations/SearchLoop';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export default function CollectionsScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const { collections, getCollectionStats, fetchCollections, deleteCollection, isLoading } = useCollectionStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Local refreshing state to prevent UI glitches
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCollections();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Usuń kolekcję",
      `Czy na pewno chcesz usunąć "${title}"? Tej operacji nie można cofnąć.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => deleteCollection(id)
        }
      ]
    );
  };

  const filteredCollections = collections.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery ? (
        <View style={{ alignItems: 'center', marginBottom: -20, marginTop: -20 }}>
          <SearchLoop width={180} height={180} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginBottom: -50, marginTop: -20 }}>
           <EmptyBox width={260} height={260} />
        </View>
      )}

      <Typography variant="h3" color={Theme.text} style={styles.emptyTitle}>
        {searchQuery ? 'Nie znaleziono' : 'Brak kolekcji'}
      </Typography>

      <Typography variant="body" color={Theme.textMuted} align="center" style={styles.emptyDescription}>
        {searchQuery
          ? `Nie znaleziono kolekcji dla "${searchQuery}"`
          : 'Stwórz swoją pierwszą kolekcję fiszek i zacznij naukę!'
        }
      </Typography>

      {!searchQuery && (
        <View style={styles.emptyButtons}>
          <TouchableOpacity
            onPress={() => router.push('/collections/create')}
            style={styles.emptyButton}
            activeOpacity={0.7}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Typography variant="bodySemi" color="#FFFFFF">
              Stwórz kolekcję
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/cards/ai-import')}
            style={styles.emptyButtonSecondary}
            activeOpacity={0.7}
          >
            <Zap size={18} color={Theme.primary} />
            <Typography variant="bodySemi" color={Theme.primary}>
              AI Import
            </Typography>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {isLoading && !collections.length && !refreshing ? (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Header */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
              <View style={styles.headerText}>
                <Typography variant="h1" color={Theme.text}>Kolekcje</Typography>
                <Typography variant="body" color={Theme.textSecondary}>
                  Zarządzaj swoją wiedzą
                </Typography>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/collections/create');
                }}
                style={styles.addButton}
                activeOpacity={0.7}
                accessibilityLabel="Dodaj kolekcję"
                accessibilityRole="button"
              >
                <Plus color={Theme.textInverse} size={24} />
              </TouchableOpacity>
            </Animated.View>

            {/* Banner / Explore Entry */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.bannerContainer}>
              <TouchableOpacity
                 onPress={() => router.push('/explore')}
                 activeOpacity={0.9}
                 style={styles.bannerTouchable}
              >
                 <LinearGradient
                   colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 1 }}
                   style={styles.bannerGradient}
                 >
                   <View style={styles.bannerContent}>
                      <View style={styles.bannerIcon}>
                         <Compass size={24} color="#FFFFFF" />
                      </View>
                      <View>
                        <Typography variant="h3" color="#FFFFFF">Biblioteka</Typography>
                        <Typography variant="body" color="rgba(255,255,255,0.9)">Pobierz gotowe zestawy</Typography>
                      </View>
                   </View>
                   <Sparkles size={20} color="#FFFFFF" style={{ opacity: 0.8 }} />
                 </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Search Bar */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={Theme.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Szukaj kolekcji..."
                  placeholderTextColor={Theme.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                    <X size={18} color={Theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            <CollectionsSkeleton />
          </ScrollView>
        ) : (
          <FlashList<CollectionData>
            data={filteredCollections}
            renderItem={({ item }) => (
              <CollectionCard
                collection={item}
                stats={getCollectionStats(item.id)}
                onDelete={() => handleDelete(item.id, item.title)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Theme.primary}
              />
            }
            ListHeaderComponent={
              <>
                {/* Header */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
                  <View style={styles.headerText}>
                    <Typography variant="h1" color={Theme.text}>Kolekcje</Typography>
                    <Typography variant="body" color={Theme.textSecondary}>
                      Zarządzaj swoją wiedzą
                    </Typography>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/collections/create');
                    }}
                    style={styles.addButton}
                    activeOpacity={0.7}
                    accessibilityLabel="Dodaj kolekcję"
                    accessibilityRole="button"
                  >
                    <Plus color={Theme.textInverse} size={24} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Banner / Explore Entry */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.bannerContainer}>
                  <TouchableOpacity
                     onPress={() => router.push('/explore')}
                     activeOpacity={0.9}
                     style={styles.bannerTouchable}
                  >
                     <LinearGradient
                       colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
                       start={{ x: 0, y: 0 }}
                       end={{ x: 1, y: 1 }}
                       style={styles.bannerGradient}
                     >
                       <View style={styles.bannerContent}>
                          <View style={styles.bannerIcon}>
                             <Compass size={24} color="#FFFFFF" />
                          </View>
                          <View>
                            <Typography variant="h3" color="#FFFFFF">Biblioteka</Typography>
                            <Typography variant="body" color="rgba(255,255,255,0.9)">Pobierz gotowe zestawy</Typography>
                          </View>
                       </View>
                       <Sparkles size={20} color="#FFFFFF" style={{ opacity: 0.8 }} />
                     </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Search Bar */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Search size={20} color={Theme.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Szukaj kolekcji..."
                      placeholderTextColor={Theme.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                        <X size={18} color={Theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              </>
            }
            ListEmptyComponent={EmptyState}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: Theme.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },

  // Banner
  bannerContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerTouchable: {
    borderRadius: Radius.xl,
    ...shadows.glow,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerIcon: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.border,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Theme.text,
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyImageContainer: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...shadows.md,
    backgroundColor: Theme.card,
  },
  emptyImage: {
    width: '100%',
    height: '100%',
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    ...shadows.glow,
  },
  emptyButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },

});
