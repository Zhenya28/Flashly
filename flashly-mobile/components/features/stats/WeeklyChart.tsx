import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface WeeklyChartProps {
  data: number[];
  title?: string;
  subtitle?: string;
}

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const BAR_MAX_HEIGHT = 80; // Reduced to prevent overflow

export function WeeklyChart({
  data,
  title = 'Ten tydzień',
  subtitle = 'Twoja aktywność',
}: WeeklyChartProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  // Calculate today's index (0 = Monday, 6 = Sunday)
  const todayIndex = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  const maxValue = useMemo(() => Math.max(...data, 1), [data]);
  const total = useMemo(() => data.reduce((a, b) => a + b, 0), [data]);

  // Calculate trend
  const trend = useMemo(() => {
    const today = data[todayIndex] || 0;
    const yesterday = data[todayIndex === 0 ? 6 : todayIndex - 1] || 0;
    return today - yesterday;
  }, [data, todayIndex]);

  // Average calculation
  const average = useMemo(() => {
    const activeDays = data.filter(v => v > 0).length;
    return activeDays > 0 ? Math.round(total / activeDays) : 0;
  }, [data, total]);

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <GlassCard padding="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Calendar size={22} color={Theme.primary} />
            </View>
            <View style={styles.headerText}>
              <Typography variant="bodySemi" color={Theme.text}>
                {title}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                {subtitle}
              </Typography>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Typography variant="h2" color={Theme.primary}>
                {total}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                łącznie
              </Typography>
            </View>
          </View>
        </View>

        {/* Chart Area */}
        <View style={styles.chartWrapper}>
          {/* Chart container with fixed height and overflow hidden */}
          <View style={styles.chartContainer}>
            {data.map((value, index) => (
              <BarItem
                key={index}
                value={value}
                maxValue={maxValue}
                label={DAY_LABELS[index]}
                isToday={index === todayIndex}
                isFuture={index > todayIndex}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.averageBadge}>
              <Typography variant="caption" color={Theme.textSecondary}>
                Średnia:
              </Typography>
              <Typography variant="bodySemi" color={Theme.text}>
                {average}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                /dzień
              </Typography>
            </View>
          </View>

          <View style={styles.trendBadge}>
            {trend > 0 ? (
              <>
                <View style={[styles.trendIcon, { backgroundColor: Theme.successLight }]}>
                  <TrendingUp size={14} color={Theme.success} />
                </View>
                <Typography variant="small" color={Theme.success} style={styles.trendText}>
                  +{trend} od wczoraj
                </Typography>
              </>
            ) : trend < 0 ? (
              <>
                <View style={[styles.trendIcon, { backgroundColor: Theme.destructiveLight }]}>
                  <TrendingDown size={14} color={Theme.destructive} />
                </View>
                <Typography variant="small" color={Theme.destructive} style={styles.trendText}>
                  {trend} od wczoraj
                </Typography>
              </>
            ) : (
              <>
                <View style={[styles.trendIcon, { backgroundColor: Theme.backgroundAlt }]}>
                  <Minus size={14} color={Theme.textMuted} />
                </View>
                <Typography variant="small" color={Theme.textMuted} style={styles.trendText}>
                  Bez zmian
                </Typography>
              </>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

interface BarItemProps {
  value: number;
  maxValue: number;
  label: string;
  isToday: boolean;
  isFuture: boolean;
  index: number;
}

function BarItem({ value, maxValue, label, isToday, isFuture, index }: BarItemProps) {
    const { colors: Theme, isDark, shadows } = useTheme();
    const styles = getStyles(Theme, shadows);
  const progress = useSharedValue(0);

  const barHeight = value > 0
    ? Math.max((value / maxValue) * BAR_MAX_HEIGHT, 12)
    : 6;

  useEffect(() => {
    progress.value = withDelay(
      100 + index * 60,
      withSpring(1, {
        damping: 14,
        stiffness: 90,
        mass: 0.8,
      })
    );
  }, [value, index]);

  const barStyle = useAnimatedStyle(() => {
    const height = interpolate(progress.value, [0, 1], [0, barHeight]);
    return { height };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [8, 0]) }],
  }));

  const getBarColor = () => {
    if (isFuture) return Theme.border;
    if (value === 0) return Theme.progressBg;
    if (isToday) return Theme.primary;
    return Theme.primaryLight;
  };

  return (
    <View style={styles.barItemContainer}>
      {/* Value label */}
      <Animated.View style={[styles.valueLabel, labelStyle]}>
        <Typography
          variant="caption"
          color={isToday ? Theme.primary : Theme.textMuted}
          style={{
            fontWeight: isToday ? '700' : '500',
            opacity: isFuture ? 0.4 : 1,
          }}
        >
          {isFuture ? '—' : value}
        </Typography>
      </Animated.View>

      {/* Bar with fixed height container */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            { backgroundColor: getBarColor() },
            isToday && styles.barToday,
          ]}
        />
      </View>

      {/* Day label */}
      <Animated.View style={[styles.dayLabel, labelStyle]}>
        <Typography
          variant="caption"
          color={isToday ? Theme.text : Theme.textMuted}
          style={{
            fontWeight: isToday ? '600' : '400',
            opacity: isFuture ? 0.5 : 1,
          }}
        >
          {label}
        </Typography>
      </Animated.View>

      {/* Today indicator */}
      {isToday && (
        <Animated.View style={[styles.todayIndicator, labelStyle]}>
          <View style={styles.todayDot} />
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'flex-end',
  },

  // Chart
  chartWrapper: {
    marginBottom: Spacing.xl,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  barItemContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 48,
  },
  valueLabel: {
    marginBottom: Spacing.sm,
    height: 18,
    justifyContent: 'center',
  },
  barContainer: {
    height: BAR_MAX_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 32,
    borderRadius: Radius.md,
    minHeight: 6,
  },
  barToday: {
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayLabel: {
    marginTop: Spacing.sm,
    height: 18,
    justifyContent: 'center',
  },
  todayIndicator: {
    marginTop: Spacing.xs,
    height: 8,
    justifyContent: 'center',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.borderLight,
  },
  footerLeft: {
    flex: 1,
  },
  averageBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    fontWeight: '600',
  },
});
