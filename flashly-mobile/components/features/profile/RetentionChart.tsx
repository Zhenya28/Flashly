import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { RetentionData } from '@/services/profile';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import { Sparkles, Clock, Award, PieChart } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface RetentionChartProps {
  data: RetentionData;
}

export function RetentionChart({ data }: RetentionChartProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const total = data.newCards + data.youngCards + data.matureCards;

  const newPercent = total > 0 ? (data.newCards / total) * 100 : 0;
  const youngPercent = total > 0 ? (data.youngCards / total) * 100 : 0;
  const maturePercent = total > 0 ? (data.matureCards / total) * 100 : 0;

  // Animation values for progress bars
  const newWidth = useSharedValue(0);
  const youngWidth = useSharedValue(0);
  const matureWidth = useSharedValue(0);

  useEffect(() => {
    newWidth.value = withDelay(
      200,
      withTiming(newPercent, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    youngWidth.value = withDelay(
      400,
      withTiming(youngPercent, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    matureWidth.value = withDelay(
      600,
      withTiming(maturePercent, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  }, [newPercent, youngPercent, maturePercent]);

  const categories = [
    {
      label: 'Nowe',
      count: data.newCards,
      percent: newPercent,
      color: Theme.warning,
      bgColor: Theme.warningLight,
      icon: Sparkles,
      description: 'Jeszcze nie przeglądane',
      animValue: newWidth,
    },
    {
      label: 'W nauce',
      count: data.youngCards,
      percent: youngPercent,
      color: Theme.primary,
      bgColor: Theme.primaryMuted,
      icon: Clock,
      description: 'Interwał 1-21 dni',
      animValue: youngWidth,
    },
    {
      label: 'Opanowane',
      count: data.matureCards,
      percent: maturePercent,
      color: Theme.success,
      bgColor: Theme.successLight,
      icon: Award,
      description: 'Interwał >21 dni',
      animValue: matureWidth,
    },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
      <GlassCard padding="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <PieChart size={20} color={Theme.primary} />
            </View>
            <View>
              <Typography variant="bodySemi" color={Theme.text}>
                Retencja wiedzy
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                Podział fiszek wg statusu
              </Typography>
            </View>
          </View>
          <View style={styles.totalBadge}>
            <Typography variant="h2" color={Theme.text}>
              {total}
            </Typography>
            <Typography variant="caption" color={Theme.textMuted}>
              fiszek
            </Typography>
          </View>
        </View>

        {/* Combined Progress Bar */}
        <View style={styles.progressBar}>
          {categories.map((cat, index) => {
            const barStyle = useAnimatedStyle(() => ({
              width: `${cat.animValue.value}%`,
            }));

            return (
              <Animated.View
                key={cat.label}
                style={[
                  styles.progressSegment,
                  barStyle,
                  { backgroundColor: cat.color },
                  index === 0 && styles.progressFirst,
                  index === categories.length - 1 && styles.progressLast,
                ]}
              />
            );
          })}
        </View>

        {/* Category Items - Vertical List */}
        <View style={styles.categoriesContainer}>
          {categories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <Animated.View
                key={cat.label}
                entering={FadeInDown.delay(400 + index * 100).duration(400)}
                style={[styles.categoryRow, { backgroundColor: cat.bgColor }]}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: Theme.card }]}>
                    <Icon size={18} color={cat.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Typography variant="bodySemi" color={Theme.text}>
                      {cat.label}
                    </Typography>
                    <Typography variant="caption" color={Theme.textMuted}>
                      {cat.description}
                    </Typography>
                  </View>
                </View>

                <View style={styles.categoryRight}>
                  <Typography variant="h2" color={Theme.text}>
                    {cat.count}
                  </Typography>
                  <View style={[styles.percentBadge, { backgroundColor: Theme.card }]}>
                    <Typography
                      variant="caption"
                      color={cat.color}
                      style={{ fontWeight: '600' }}
                    >
                      {Math.round(cat.percent)}%
                    </Typography>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadge: {
    alignItems: 'flex-end',
  },
  progressBar: {
    height: 14,
    borderRadius: Radius.full,
    backgroundColor: Theme.progressBg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  progressSegment: {
    height: '100%',
  },
  progressFirst: {
    borderTopLeftRadius: Radius.full,
    borderBottomLeftRadius: Radius.full,
  },
  progressLast: {
    borderTopRightRadius: Radius.full,
    borderBottomRightRadius: Radius.full,
  },
  categoriesContainer: {
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  percentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
});
