import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { ForecastDay } from '@/services/profile';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { CalendarDays, TrendingUp, Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface ReviewForecastProps {
  data: ForecastDay[];
}

const BAR_MAX_HEIGHT = 80;

export function ReviewForecast({ data }: ReviewForecastProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  if (!data || data.length === 0) {
    return (
      <GlassCard padding="lg">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <CalendarDays size={18} color={Theme.primary} />
            </View>
            <Typography variant="bodySemi" color={Theme.text}>
              Prognoza powtórek
            </Typography>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Typography variant="caption" color={Theme.textMuted}>
            Brak danych prognozy
          </Typography>
        </View>
      </GlassCard>
    );
  }

  const maxDue = useMemo(() => {
    const max = Math.max(...data.map((d) => d.dueCount));
    return max > 0 ? max : 1;
  }, [data]);

  const totalUpcoming = useMemo(() => {
    return data.reduce((sum, d) => sum + d.dueCount, 0);
  }, [data]);

  // Calculate trend
  const todayCount = data[0]?.dueCount || 0;
  const avgCount = totalUpcoming / data.length;
  const isBusy = todayCount > avgCount * 1.5;

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
      <GlassCard padding="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <CalendarDays size={18} color={Theme.primary} />
            </View>
            <View>
              <Typography variant="bodySemi" color={Theme.text}>
                Prognoza powtórek
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                Następne 7 dni
              </Typography>
            </View>
          </View>
          <View style={styles.totalBadge}>
            <Typography variant="h3" color={Theme.primary}>
              {totalUpcoming}
            </Typography>
            <Typography variant="caption" color={Theme.textMuted}>
              łącznie
            </Typography>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          {data.map((day, index) => (
            <ForecastBar
              key={`forecast-${day.date}-${index}`}
              day={day}
              maxDue={maxDue}
              index={index}
              isToday={index === 0}
            />
          ))}
        </View>

        {/* Info Tip */}
        <View style={styles.infoTip}>
          <View style={styles.infoIcon}>
            <Lightbulb size={14} color={Theme.warning} />
          </View>
          <Typography variant="caption" color={Theme.textSecondary} style={styles.infoText}>
            {totalUpcoming > 0
              ? isBusy
                ? 'Dziś masz dużo powtórek! Zacznij wcześnie.'
                : 'Regularne powtórki pomagają zapamiętać na dłużej.'
              : 'Brak zaplanowanych powtórek. Dodaj nowe słówka!'}
          </Typography>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

interface ForecastBarProps {
  day: ForecastDay;
  maxDue: number;
  index: number;
  isToday: boolean;
}

function ForecastBar({ day, maxDue, index, isToday }: ForecastBarProps) {
    const { colors: Theme, isDark, shadows } = useTheme();
    const styles = getStyles(Theme);
  const progress = useSharedValue(0);
  const barHeight = day.dueCount > 0 ? Math.max((day.dueCount / maxDue) * BAR_MAX_HEIGHT, 8) : 4;

  useEffect(() => {
    progress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  }, [index]);

  const barStyle = useAnimatedStyle(() => {
    const height = interpolate(progress.value, [0, 1], [0, barHeight]);
    return {
      height,
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [10, 0]) }],
  }));

  const isEmpty = day.dueCount === 0;

  return (
    <View style={styles.barItemContainer}>
      {/* Count label */}
      <Animated.View style={[styles.countLabel, labelStyle]}>
        <Typography
          variant="caption"
          color={isToday ? Theme.primary : Theme.textMuted}
          style={{ fontWeight: isToday ? '700' : '400', fontSize: 11 }}
        >
          {day.dueCount}
        </Typography>
      </Animated.View>

      {/* Bar */}
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            {
              backgroundColor: isEmpty
                ? Theme.progressBg
                : isToday
                ? Theme.primary
                : Theme.primaryLight,
            },
          ]}
        />
      </View>

      {/* Day label */}
      <Animated.View style={labelStyle}>
        <Typography
          variant="caption"
          color={isToday ? Theme.text : Theme.textMuted}
          style={{ fontWeight: isToday ? '600' : '400', fontSize: 10 }}
        >
          {day.dayLabel}
        </Typography>
      </Animated.View>

      {/* Today indicator */}
      {isToday && <View style={styles.todayDot} />}
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadge: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  barItemContainer: {
    flex: 1,
    alignItems: 'center',
  },
  countLabel: {
    marginBottom: 6,
    height: 16,
  },
  barWrapper: {
    height: BAR_MAX_HEIGHT,
    width: '100%',
    maxWidth: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: Radius.sm,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.primary,
    marginTop: 4,
  },
  infoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.warningLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
});
