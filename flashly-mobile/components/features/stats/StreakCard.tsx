import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '@/components/ui/Typography';
import { AnimatedFireIcon } from '@/components/ui/AnimatedFireIcon';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Zap, Trophy } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface StreakCardProps {
  streak: number;
  bestStreak?: number;
  todayCompleted?: boolean;
}

export function StreakCard({ streak, bestStreak = 0, todayCompleted = false }: StreakCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const isActive = streak > 0;

  const getStreakMessage = () => {
    if (streak === 0) return 'Zacznij swoją serię!';
    if (streak === 1) return 'Pierwszy dzień!';
    if (streak < 7) return 'Świetny początek!';
    if (streak < 30) return 'Niesamowita seria!';
    if (streak < 100) return 'Jesteś mistrzem!';
    return 'Legendarny!';
  };

  return (
    <Animated.View entering={FadeInDown.delay(50).duration(500)}>
      {isActive ? (
        <LinearGradient
          colors={[Theme.streakGradientStart, Theme.streakGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Animated fire icon - static container, animated flames */}
            <View style={styles.fireContainer}>
              <View style={styles.fireBgActive}>
                <AnimatedFireIcon size={36} isActive={true} />
              </View>
            </View>

            {/* Streak info */}
            <View style={styles.textContainer}>
              <View style={styles.streakRow}>
                <Typography variant="h1" color="#FFFFFF" style={styles.streakNumber}>
                  {streak}
                </Typography>
                <Typography variant="body" color="rgba(255,255,255,0.85)">
                  {streak === 1 ? 'dzień' : 'dni'}
                </Typography>
              </View>
              <Typography variant="caption" color="rgba(255,255,255,0.75)">
                {getStreakMessage()}
              </Typography>
            </View>

            {/* Best streak badge */}
            {bestStreak > 0 && bestStreak > streak && (
              <View style={styles.bestBadgeActive}>
                <Trophy size={12} color="#FFFFFF" />
                <Typography variant="caption" color="#FFFFFF" style={{ marginLeft: 4 }}>
                  Rekord: {bestStreak}
                </Typography>
              </View>
            )}

            {/* Today status */}
            {todayCompleted && (
              <View style={styles.todayBadgeActive}>
                <Zap size={12} color="#FFFFFF" fill="#FFFFFF" />
                <Typography variant="caption" color="#FFFFFF" style={styles.todayText}>
                  Dziś zaliczone!
                </Typography>
              </View>
            )}
          </View>
        </LinearGradient>
      ) : (
        // Inactive state - white background, static fire
        <View style={styles.containerInactive}>
          <View style={styles.content}>
            {/* Static fire icon */}
            <View style={styles.fireContainer}>
              <View style={styles.fireBgInactive}>
                <AnimatedFireIcon size={36} isActive={false} />
              </View>
            </View>

            {/* Streak info */}
            <View style={styles.textContainer}>
              <View style={styles.streakRow}>
                <Typography variant="h1" color={Theme.textMuted} style={styles.streakNumber}>
                  {streak}
                </Typography>
                <Typography variant="body" color={Theme.textMuted}>
                  dni
                </Typography>
              </View>
              <Typography variant="caption" color={Theme.textMuted}>
                {getStreakMessage()}
              </Typography>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  containerInactive: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  fireContainer: {
    marginRight: Spacing.md,
  },
  fireBgActive: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireBgInactive: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
  },
  bestBadgeActive: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  todayBadgeActive: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  todayText: {
    marginLeft: 4,
    fontWeight: '600',
  },
});
