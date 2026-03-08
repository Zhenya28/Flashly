import { View, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ArrowLeft, Search, Layers } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { useCollectionStore } from '@/store/collectionStore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FeaturedCollectionCard } from '@/components/features/explore/FeaturedCollectionCard';
import { CategoryChip } from '@/components/features/explore/CategoryChip';
import { PublicCollectionCard } from '@/components/features/explore/PublicCollectionCard';
import { ExploreSkeleton } from '@/components/features/skeletons/ExploreSkeleton';
import { useTheme } from '@/hooks/useTheme';

export default function ExploreScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const {
    categories,
    publicCollections,
    fetchCategories,
    fetchPublicCollections,
    cloneCollection,
    isLoading
  } = useCollectionStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchCategories(), fetchPublicCollections()]);
      setInitialLoaded(true);
    };
    load();
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCategoryPress = useCallback((categoryId: string | null) => {
    Haptics.selectionAsync();
    setSelectedCategory(categoryId);
    fetchPublicCollections(categoryId || undefined);
  }, [fetchPublicCollections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCategories(),
      fetchPublicCollections(selectedCategory || undefined)
    ]);
    setRefreshing(false);
  }, [selectedCategory, fetchCategories, fetchPublicCollections]);

  const handleClone = useCallback(async (id: string) => {
    await cloneCollection(id);
  }, [cloneCollection]);

  // Filter by search
  const filteredCollections = useMemo(() => {
    if (!debouncedSearch) return publicCollections;
    return publicCollections.filter(c =>
      c.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [publicCollections, debouncedSearch]);

  // Featured = top 1 by downloads (hide when filtering)
  const featuredCollection = useMemo(() => {
    if (debouncedSearch || selectedCategory) return null;
    if (publicCollections.length === 0) return null;
    return [...publicCollections].sort((a, b) =>
      (b.downloads_count || 0) - (a.downloads_count || 0)
    )[0];
  }, [publicCollections, debouncedSearch, selectedCategory]);

  // List without featured
  const listData = useMemo(() => {
    if (!featuredCollection) return filteredCollections;
    return filteredCollections.filter(c => c.id !== featuredCollection.id);
  }, [filteredCollections, featuredCollection]);

  const showSkeleton = !initialLoaded && isLoading;

  return (
    <GradientBackground variant="subtle">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.flex} edges={['top']}>

        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Theme.primary}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Typography variant="h1" style={styles.pageTitle}>Odkrywaj</Typography>
            <Typography variant="body" color={Theme.textSecondary} style={styles.pageSubtitle}>
              Gotowe zestawy fiszek do nauki
            </Typography>
          </Animated.View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Search size={18} color={Theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj zestawów..."
              placeholderTextColor={Theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Skeleton Loading */}
          {showSkeleton && <ExploreSkeleton />}

          {/* Content (after loading) */}
          {!showSkeleton && (
            <>
              {/* Featured Card */}
              {featuredCollection && (
                <FeaturedCollectionCard collection={featuredCollection} />
              )}

              {/* Category Chips */}
              {!debouncedSearch && categories.length > 0 && (
                <View style={styles.categoriesSection}>
                  <Typography variant="h4" style={styles.sectionTitle}>Kategorie</Typography>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesRow}
                  >
                    {/* "Wszystkie" chip */}
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                      <TouchableOpacity
                        onPress={() => handleCategoryPress(null)}
                        activeOpacity={0.85}
                        style={[styles.allChip, selectedCategory !== null && { opacity: 0.45 }]}
                      >
                        <Layers size={16} color={Theme.primary} strokeWidth={2.5} />
                        <Typography variant="small" color={Theme.primary} style={styles.allChipText}>
                          Wszystkie
                        </Typography>
                      </TouchableOpacity>
                    </Animated.View>

                    {categories.map((cat, i) => (
                      <CategoryChip
                        key={cat.id}
                        category={cat}
                        isSelected={selectedCategory === null || selectedCategory === cat.id}
                        onPress={() => handleCategoryPress(selectedCategory === cat.id ? null : cat.id)}
                        index={i}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Collections List */}
              <Typography variant="h4" style={styles.sectionTitle}>
                {debouncedSearch
                  ? 'Wyniki wyszukiwania'
                  : selectedCategory
                    ? categories.find(c => c.id === selectedCategory)?.name || 'Zestawy'
                    : 'Polecane dla Ciebie'}
              </Typography>

              {listData.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Layers size={40} color={Theme.textMuted} style={{ opacity: 0.5 }} />
                  <Typography variant="body" color={Theme.textMuted} style={{ marginTop: 12 }}>
                    {debouncedSearch ? 'Nie znaleziono pasujących zestawów.' : 'Brak zestawów w tej kategorii.'}
                  </Typography>
                </View>
              )}

              <View style={{ paddingHorizontal: Spacing.md }}>
                {listData.map((collection, index) => (
                  <PublicCollectionCard
                    key={collection.id}
                    collection={collection}
                    onClone={() => handleClone(collection.id)}
                    index={index}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  flex: { flex: 1 },

  nav: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Theme.text,
    letterSpacing: -0.5,
    paddingHorizontal: Spacing.lg,
  },
  pageSubtitle: {
    marginTop: 4,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    height: 52,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Theme.text,
    fontFamily: 'SourceSans3_400Regular',
    height: '100%',
  },

  // Categories
  categoriesSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
  },
  categoriesRow: {
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  allChip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primaryMuted,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    ...shadows.sm,
  },
  allChipText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: Spacing.lg,
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Theme.border,
    borderStyle: 'dashed',
  },
});
