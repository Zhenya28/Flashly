import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Play,
  Plus,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  Target,
  Zap,
} from 'lucide-react-native';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAuthStore } from '@/store/authStore';
import { ProfileService } from '@/services/profile';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { StreakCard, WeeklyChart, CircularProgress, MasteryRing } from '@/components/features/stats';
import { DashboardSkeleton } from '@/components/features/skeletons/DashboardSkeleton';
import SuccessCup from '@/components/illustrations/SuccessCup';

export default function DashboardScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const { stats, isLoading, error, refreshDashboard } = useDashboardStore();

  // Local refreshing state to prevent UI glitches when navigating away
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDashboard(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard]);

  const { isAuthenticated } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshDashboard();
      }
    }, [isAuthenticated])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 18) return 'Dzień dobry,';
    return 'Dobry wieczór,';
  };

  // Safe data accessors
  const userName = stats?.profile?.full_name?.split(' ')[0] || 'Użytkowniku';
  // Use email as seed for consistency with Profile screen
  const { user } = useAuthStore();
  const avatarUrl = user?.avatar_url || stats?.profile?.avatar_url || ProfileService.generateDiceBearAvatar(user?.email || 'default');
  const streak = stats?.streak || 0;
  const dueCards = stats?.dueCards || 0;
  const newCards = stats?.newCards || 0;
  const cardsToStudy = stats?.cardsToStudy || 0;
  const dailyGoal = stats?.dailyGoal || 10;
  const lastDeck = stats?.lastDeck;
  const totalCards = stats?.totalCards || 0;
  const masteredCards = stats?.masteredCards || 0;
  const collectionsCount = stats?.collectionsCount || 0;
  const todayStudied = stats?.todayStudied || 0;
  const weeklyProgress = stats?.weeklyProgress || [0, 0, 0, 0, 0, 0, 0];

  const dailyProgress = Math.min((todayStudied / dailyGoal) * 100, 100);
  const isGoalComplete = todayStudied >= dailyGoal;

  // Loading state
  if (isLoading && !stats) {
    return (
      <GradientBackground variant="subtle">
        <SafeAreaView style={styles.flex} edges={['top']}>
          <DashboardSkeleton />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <GradientBackground variant="subtle">
        <View style={styles.centered}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Typography variant="h3" color={Theme.text} style={{ marginBottom: 8 }}>
            Coś poszło nie tak
          </Typography>
          <Typography variant="caption" color={Theme.textMuted} style={{ marginBottom: 24 }}>
            Nie udało się załadować danych
          </Typography>
          <TouchableOpacity onPress={() => refreshDashboard(true)} style={[styles.retryButton, { backgroundColor: Theme.primaryMuted }]}>
            <Typography variant="bodySemi" color={Theme.primary}>
              Spróbuj ponownie
            </Typography>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }



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
          <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Typography variant="label" color={Theme.textMuted}>
                {getGreeting()}
              </Typography>
              <Typography variant="h1" color={Theme.text}>
                {userName}
              </Typography>
            </View>

            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Profil użytkownika" accessibilityRole="button">
              <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityLabel="Avatar" />
            </TouchableOpacity>
          </Animated.View>

          {/* Streak Card */}
          <View style={styles.section}>
            <StreakCard streak={streak} todayCompleted={todayStudied > 0} />
          </View>

          {/* Hero Card - Cards to Study */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            {cardsToStudy > 0 ? (
              // Active state - cards to study
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push('/(tabs)/learning')}
              >
                <LinearGradient
                  colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  {/* Decorative depth layers */}
                  <View style={styles.heroDecoCircle1} />
                  <View style={styles.heroDecoCircle2} />
                  <View style={styles.heroDecoLine} />

                  <View style={styles.heroContent}>
                    <View style={styles.heroLeft}>
                      {/* Status badge */}
                      <View style={styles.heroBadge}>
                        <Zap size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Typography variant="label" color="#FFFFFF" style={{ letterSpacing: 0.8 }}>
                          GOTOWY NA NAUKĘ
                        </Typography>
                      </View>

                      {/* Big number */}
                      <View style={styles.heroNumbers}>
                        <Typography variant="hero" color="#FFFFFF" style={styles.heroNumber}>
                          {cardsToStudy}
                        </Typography>
                        <Typography variant="bodySemi" color="rgba(255,255,255,0.9)" style={{ marginTop: -4 }}>
                          {cardsToStudy === 1
                            ? 'słówko do nauki'
                            : cardsToStudy < 5
                            ? 'słówka do nauki'
                            : 'słówek do nauki'}
                        </Typography>
                      </View>

                      {/* Breakdown pills */}
                      <View style={styles.heroBreakdown}>
                        {dueCards > 0 && (
                          <View style={styles.breakdownPill}>
                            <View style={[styles.breakdownDot, { backgroundColor: '#FFFFFF' }]} />
                            <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '600', fontSize: 11 }}>
                              {dueCards} do powtórki
                            </Typography>
                          </View>
                        )}
                        {newCards > 0 && (
                          <View style={[styles.breakdownPill, { backgroundColor: 'rgba(251,191,36,0.25)' }]}>
                            <View style={[styles.breakdownDot, { backgroundColor: '#FCD34D' }]} />
                            <Typography variant="caption" color="#FCD34D" style={{ fontWeight: '600', fontSize: 11 }}>
                              {newCards} nowych
                            </Typography>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Daily Progress Ring */}
                    <View style={styles.heroRight}>
                      <View style={styles.progressRingOuter}>
                        <CircularProgress
                          progress={dailyProgress}
                          size={100}
                          strokeWidth={9}
                          gradientColors={
                            isGoalComplete
                              ? [Theme.success, Theme.successDark]
                              : ['#34D399', '#10B981']
                          }
                          backgroundColor="rgba(255,255,255,0.12)"
                          showPercentage={false}
                        >
                          <View style={styles.progressCenter}>
                            <Typography variant="h1" color="#FFFFFF" style={{ fontSize: 28, lineHeight: 32 }}>
                              {todayStudied}
                            </Typography>
                            <Typography variant="caption" color="rgba(255,255,255,0.6)" style={{ fontSize: 11 }}>
                              / {dailyGoal}
                            </Typography>
                          </View>
                        </CircularProgress>
                      </View>
                    </View>
                  </View>

                  {/* CTA Button - frosted glass effect */}
                  <TouchableOpacity
                    style={styles.heroButton}
                    onPress={() => router.push('/(tabs)/learning')}
                    activeOpacity={0.85}
                  >
                    <Typography variant="bodySemi" color="#FFFFFF">
                      Rozpocznij naukę
                    </Typography>
                    <View style={styles.heroButtonArrow}>
                      <ArrowRight size={16} color={Theme.heroGradientStart} />
                    </View>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            ) : collectionsCount === 0 ? (
               // New User State
               <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push('/collections/create')}
              >
                <LinearGradient
                  colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroDecoCircle1} />
                  <View style={styles.heroDecoCircle2} />

                  <View style={styles.emptyStateContent}>
                    <View style={{ alignItems: 'center', marginBottom: -24, marginTop: -20 }}>
                         <SuccessCup width={200} height={200} style={{ opacity: 0.9 }} />
                    </View>

                    <Typography variant="h2" color="#FFFFFF" style={styles.emptyStateTitle}>
                      Witaj w Flashly!
                    </Typography>

                    <Typography variant="body" color="rgba(255,255,255,0.8)" style={styles.emptyStateSubtitle}>
                      Zacznij swoją przygodę z nauką. Stwórz pierwszą kolekcję!
                    </Typography>
                  </View>

                  <TouchableOpacity
                    style={styles.emptyStateCta}
                    onPress={() => router.push('/collections/create')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.88)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.emptyStateCtaGradient}
                    >
                      <Plus size={18} color={Theme.heroGradientStart} strokeWidth={2.5} />
                      <Typography variant="bodySemi" color={Theme.heroGradientStart}>
                        Stwórz kolekcję
                      </Typography>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // All Done state
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push('/collections/create')}
              >
                <LinearGradient
                  colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroDecoCircle1} />
                  <View style={styles.heroDecoCircle2} />

                  <View style={styles.emptyStateContent}>
                    <View style={{ alignItems: 'center', marginBottom: -40, marginTop: -20 }}>
                         <SuccessCup width={200} height={200} />
                    </View>

                    <Typography variant="h2" color="#FFFFFF" style={styles.emptyStateTitle}>
                      Wszystko zrobione!
                    </Typography>

                    <Typography variant="body" color="rgba(255,255,255,0.8)" style={styles.emptyStateSubtitle}>
                      Świetna robota! Wróć jutro lub dodaj nowe słówka
                    </Typography>
                  </View>

                  <TouchableOpacity
                    style={styles.emptyStateCta}
                    onPress={() => router.push('/collections/create')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.88)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.emptyStateCtaGradient}
                    >
                      <Plus size={18} color={Theme.heroGradientStart} strokeWidth={2.5} />
                      <Typography variant="bodySemi" color={Theme.heroGradientStart}>
                        Dodaj nowe słówka
                      </Typography>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Weekly Progress Chart */}
          <View style={styles.section}>
            <WeeklyChart
              data={weeklyProgress}
              title="Ten tydzień"
              subtitle="Powtórek dziennie"
            />
          </View>

          {/* Quick Stats */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <GlassCard padding="md" style={styles.statCardInner}>
                <View style={[styles.statIcon, { backgroundColor: Theme.infoLight }]}>
                  <BookOpen size={18} color={Theme.info} />
                </View>
                <Typography variant="h2" color={Theme.text}>{totalCards}</Typography>
                <Typography variant="caption" color={Theme.textMuted}>Wszystkie fiszki</Typography>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <GlassCard padding="md" style={styles.statCardInner}>
                <View style={[styles.statIcon, { backgroundColor: Theme.successLight }]}>
                  <Award size={18} color={Theme.success} />
                </View>
                <Typography variant="h2" color={Theme.text}>{masteredCards}</Typography>
                <Typography variant="caption" color={Theme.textMuted}>Opanowane</Typography>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.quickActionsSection}>
            <View style={styles.sectionHeader}>
              <Typography variant="bodySemi" color={Theme.text}>
                Szybkie akcje
              </Typography>
            </View>

            {/* Primary Action - Continue Learning (Widget Style) */}
            {lastDeck && (
              <Animated.View entering={FadeInDown.delay(280).duration(400)}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/study/${lastDeck.id}`)}
                >
                  <GlassCard variant="elevated" padding="lg" style={styles.modeWidget}>
                    <View style={styles.widgetHeader}>
                      <View style={[styles.widgetIcon, { backgroundColor: Theme.primaryMuted }]}>
                        <Play size={18} fill={Theme.primary} color={Theme.primary} />
                      </View>
                      <View style={styles.widgetHeaderText}>
                        <Typography variant="h3" color={Theme.text}>
                          Kontynuuj naukę
                        </Typography>
                        <Typography variant="caption" color={Theme.textMuted} numberOfLines={1}>
                          {lastDeck.title}
                        </Typography>
                      </View>
                    </View>

                    <View style={styles.widgetImageContainer}>
                      <Image
                        source={require('@/assets/images/quick-action.png')}
                        style={styles.widgetImage}
                        contentFit="cover"
                      />
                    </View>

                    {/* Progress section */}
                    <View style={styles.widgetStats}>
                      <View style={styles.widgetStatRow}>
                        <Typography variant="caption" color={Theme.textMuted}>
                          Postęp talii
                        </Typography>
                        <Typography variant="caption" color={Theme.primary} style={{ fontWeight: '600' }}>
                          {lastDeck.progress}%
                        </Typography>
                      </View>
                      <View style={styles.widgetProgressBar}>
                        <View style={[styles.widgetProgressFill, { width: `${lastDeck.progress}%` }]} />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.widgetButton, { backgroundColor: Theme.primary }]}
                      onPress={() => router.push(`/study/${lastDeck.id}`)}
                      activeOpacity={0.85}
                    >
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      <Typography variant="bodySemi" color="#FFFFFF">
                        Wznów
                      </Typography>
                    </TouchableOpacity>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Secondary Actions Row */}
            <View style={styles.secondaryActions}>
              <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.secondaryActionWrapper}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/cards/ai-import')}
                  style={styles.secondaryAction}
                >
                  <View style={[styles.secondaryActionIcon, { backgroundColor: Theme.primaryMuted }]}>
                    <Zap size={22} color={Theme.primary} strokeWidth={2.5} />
                  </View>
                  <Typography variant="bodySemi" color={Theme.text} style={styles.secondaryActionLabel}>
                    AI Import
                  </Typography>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(360).duration(400)} style={styles.secondaryActionWrapper}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/collections')}
                  style={styles.secondaryAction}
                >
                  <View style={[styles.secondaryActionIcon, { backgroundColor: Theme.backgroundAlt }]}>
                    <Layers size={22} color={Theme.textSecondary} strokeWidth={2} />
                  </View>
                  <View style={styles.secondaryActionTextGroup}>
                    <Typography variant="bodySemi" color={Theme.text} style={styles.secondaryActionLabel}>
                      Kolekcje
                    </Typography>
                    <View style={[styles.collectionsBadge, { backgroundColor: Theme.primaryMuted }]}>
                      <Typography variant="caption" color={Theme.primary} style={{ fontWeight: '600' }}>
                        {collectionsCount}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxxl + Spacing.xxl,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Theme.primaryMuted,
    borderRadius: Radius.md,
  },
  section: {
    marginBottom: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.backgroundAlt,
    borderWidth: 2,
    borderColor: Theme.primaryMuted,
  },

  // Hero Card
  heroCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecoCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecoCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroDecoLine: {
    position: 'absolute',
    top: 0,
    right: 80,
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    marginLeft: Spacing.md,
  },
  progressRingOuter: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroNumbers: {
    marginBottom: Spacing.sm,
  },
  heroNumber: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  heroBreakdown: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  breakdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressCenter: {
    alignItems: 'center',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 1,
  },
  heroButtonArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonSecondary: {
    backgroundColor: Theme.card,
    borderWidth: 2,
    borderColor: Theme.primary,
  },

  // Empty State - Celebration
  celebrationRing1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  celebrationRing2: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  celebrationRing3: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    zIndex: 1,
  },
  achievementBadgeOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  achievementBadgeGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  achievementBadgeInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  emptyStateTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  completionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.success,
  },
  emptyStateCta: {
    marginTop: Spacing.lg,
  },
  emptyStateCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    ...shadows.sm,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  statCardInner: {
    minHeight: 110,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  // Quick Actions Section
  quickActionsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Widget Styles (copied from learning.tsx for consistency)
  modeWidget: {
    overflow: 'hidden',
    backgroundColor: Theme.card,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  widgetIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetHeaderText: {
    flex: 1,
  },
  widgetImageContainer: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    backgroundColor: Theme.text,
  },
  widgetImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  widgetStats: {
    marginBottom: Spacing.md,
  },
  widgetStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  widgetProgressBar: {
    height: 6,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  widgetProgressFill: {
    height: '100%',
    backgroundColor: Theme.primary,
    borderRadius: 3,
  },
  widgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },

  // Primary Action (Legacy/Fallback)
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  primaryActionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    flex: 1,
    gap: 2,
  },
  primaryActionArrow: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryActionProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  primaryActionProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  primaryActionProgressText: {
    minWidth: 32,
    fontWeight: '600',
  },

  // Secondary Actions
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  secondaryActionWrapper: {
    flex: 1,
  },
  secondaryAction: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Theme.borderLight,
    ...shadows.sm,
  },
  secondaryActionIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionLabel: {
    textAlign: 'center',
  },
  secondaryActionTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  collectionsBadge: {
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },

  // Quote
  quoteCard: {
    marginBottom: Spacing.lg,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quoteIconContainer: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: Spacing.md,
    fontSize: 15,
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
});
