import React, { useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BookOpen,
  Award,
  Percent,
  Brain,
} from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProfileStore } from '@/store/profileStore';
import {
  ActivityHeatmap,
  RetentionChart,
  ReviewForecast,
  TimeFilterTabs,
} from '@/components/features/profile';
import { WeeklyChart } from '@/components/features/stats';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

function StatisticsSkeleton() {
  const { colors: Theme, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  return (
    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
      {/* Stats Grid Skeleton */}
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.statCard}>
              <Skeleton width={44} height={44} borderRadius={Radius.lg} style={{ marginBottom: Spacing.md }} />
              <Skeleton width={60} height={28} style={{ marginBottom: Spacing.xs }} />
              <Skeleton width={90} height={14} />
            </View>
          ))}
        </View>
      </View>

      {/* Weekly Chart Skeleton */}
      <View style={styles.section}>
        <Skeleton width={100} height={14} style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={160} borderRadius={Radius.xl} />
      </View>

      {/* Time Filter Skeleton */}
      <View style={styles.section}>
        <Skeleton width={120} height={14} style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={44} borderRadius={Radius.lg} />
      </View>

      {/* Retention Chart Skeleton */}
      <View style={styles.section}>
        <Skeleton width={130} height={14} style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={120} borderRadius={Radius.xl} />
      </View>

      {/* Heatmap Skeleton */}
      <View style={styles.section}>
        <Skeleton width={160} height={14} style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={100} borderRadius={Radius.xl} />
      </View>

      {/* Forecast Skeleton */}
      <View style={styles.sectionLast}>
        <Skeleton width={140} height={14} style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={120} borderRadius={Radius.xl} />
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const {
    stats,
    isLoading,
    timeFilter,
    fetchStats,
    setTimeFilter,
  } = useProfileStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStats(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchStats]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  // Show skeleton on first load (no cached stats yet)
  const isFirstLoad = isLoading && !stats;

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
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
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Typography variant="h1" color={Theme.text}>Statystyki</Typography>
                <Typography variant="body" color={Theme.textSecondary}>
                  Twoje postępy w nauce
                </Typography>
              </View>
            </View>

            {isFirstLoad ? (
              <StatisticsSkeleton />
            ) : (
              <>
                {/* Quick Stats Grid */}
                <Animated.View
                  entering={FadeInDown.delay(100).duration(500)}
                  style={[styles.section, { marginTop: Spacing.lg }]}
                >
                  <View style={styles.statsGrid}>
                    {/* Total Words */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconContainer, { backgroundColor: Theme.primaryMuted }]}>
                        <BookOpen size={20} color={Theme.primary} />
                      </View>
                      <Typography variant="h1" color={Theme.text} style={styles.statNumber}>
                        {stats?.totalWords || 0}
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        Wszystkich fiszek
                      </Typography>
                    </View>

                    {/* Mastered */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconContainer, { backgroundColor: Theme.successLight }]}>
                        <Award size={20} color={Theme.success} />
                      </View>
                      <Typography variant="h1" color={Theme.text} style={styles.statNumber}>
                        {stats?.masteredWords || 0}
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        Opanowanych
                      </Typography>
                    </View>

                    {/* Success Rate */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconContainer, { backgroundColor: Theme.infoLight }]}>
                        <Percent size={20} color={Theme.info} />
                      </View>
                      <Typography variant="h1" color={Theme.text} style={styles.statNumber}>
                        {stats?.successRate || 0}%
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        Skuteczność
                      </Typography>
                    </View>

                    {/* Knowledge Growth */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconContainer, { backgroundColor: Theme.warningLight }]}>
                        <Brain size={20} color={Theme.warning} />
                      </View>
                      <Typography variant="h1" color={Theme.text} style={styles.statNumber}>
                        {stats?.knowledgeGrowth?.toFixed(1) || '0'}
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        Dni avg retencji
                      </Typography>
                    </View>
                  </View>
                </Animated.View>

                {/* Weekly Chart */}
                <Animated.View
                  entering={FadeInDown.delay(200).duration(500)}
                  style={styles.section}
                >
                  <Typography variant="label" color={Theme.textMuted} style={styles.sectionLabel}>
                    Ten tydzień
                  </Typography>
                  <WeeklyChart
                    data={stats?.weeklyProgress || [0, 0, 0, 0, 0, 0, 0]}
                    title="Ten tydzień"
                    subtitle="Powtórek dziennie"
                  />
                </Animated.View>

                {/* Time Filter */}
                <Animated.View
                  entering={FadeInDown.delay(300).duration(500)}
                  style={styles.section}
                >
                  <Typography variant="label" color={Theme.textMuted} style={styles.sectionLabel}>
                    Zakres czasowy
                  </Typography>
                  <TimeFilterTabs value={timeFilter} onChange={setTimeFilter} />
                </Animated.View>

                {/* Retention Chart */}
                <Animated.View
                  entering={FadeInDown.delay(400).duration(500)}
                  style={styles.section}
                >
                  <Typography variant="label" color={Theme.textMuted} style={styles.sectionLabel}>
                    Retencja wiedzy
                  </Typography>
                  {stats?.retentionData && (
                    <RetentionChart data={stats.retentionData} />
                  )}
                </Animated.View>

                {/* Activity Heatmap */}
                <Animated.View
                  entering={FadeInDown.delay(500).duration(500)}
                  style={styles.section}
                >
                  <Typography variant="label" color={Theme.textMuted} style={styles.sectionLabel}>
                    Aktywność (12 tygodni)
                  </Typography>
                  {stats?.activityData && (
                    <ActivityHeatmap data={stats.activityData} />
                  )}
                </Animated.View>

                {/* Review Forecast */}
                <Animated.View
                  entering={FadeInDown.delay(600).duration(500)}
                  style={styles.sectionLast}
                >
                  <Typography variant="label" color={Theme.textMuted} style={styles.sectionLabel}>
                    Prognoza powtórek
                  </Typography>
                  {stats?.forecastData && (
                    <ReviewForecast data={stats.forecastData} />
                  )}
                </Animated.View>
              </>
            )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'transparent',
  },
  headerText: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionLast: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    ...shadows.md,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statNumber: {
    marginBottom: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
  },
});
