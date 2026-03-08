import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Award, BookOpen, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MasteryRingProps {
  total: number;
  mastered: number;
  learning: number;
  newCards: number;
  size?: number;
}

export function MasteryRing({
  total,
  mastered,
  learning,
  newCards,
  size = 160,
}: MasteryRingProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate percentages
  const masteredPercent = total > 0 ? (mastered / total) * 100 : 0;
  const learningPercent = total > 0 ? (learning / total) * 100 : 0;
  const newPercent = total > 0 ? (newCards / total) * 100 : 0;

  // Animation values
  const masteredProgress = useSharedValue(0);
  const learningProgress = useSharedValue(0);
  const newProgress = useSharedValue(0);

  useEffect(() => {
    masteredProgress.value = withDelay(
      200,
      withTiming(masteredPercent, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    learningProgress.value = withDelay(
      400,
      withTiming(learningPercent, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    newProgress.value = withDelay(
      600,
      withTiming(newPercent, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  }, [masteredPercent, learningPercent, newPercent]);

  // Starting positions for each segment
  const masteredStart = 0;
  const learningStart = masteredPercent;
  const newStart = masteredPercent + learningPercent;

  const masteredAnimProps = useAnimatedProps(() => ({
    strokeDasharray: `${(circumference * masteredProgress.value) / 100} ${circumference}`,
  }));

  const learningAnimProps = useAnimatedProps(() => ({
    strokeDasharray: `${(circumference * learningProgress.value) / 100} ${circumference}`,
  }));

  const newAnimProps = useAnimatedProps(() => ({
    strokeDasharray: `${(circumference * newProgress.value) / 100} ${circumference}`,
  }));

  const categories = [
    {
      label: 'Opanowane',
      count: mastered,
      percent: masteredPercent,
      color: Theme.success,
      lightColor: Theme.successLight,
      icon: Award,
    },
    {
      label: 'W nauce',
      count: learning,
      percent: learningPercent,
      color: Theme.primary,
      lightColor: Theme.primaryMuted,
      icon: BookOpen,
    },
    {
      label: 'Nowe',
      count: newCards,
      percent: newPercent,
      color: Theme.warning,
      lightColor: Theme.warningLight,
      icon: Sparkles,
    },
  ];

  return (
    <Animated.View entering={FadeIn.delay(100).duration(500)}>
      <GlassCard padding="lg">
        <View style={styles.container}>
          {/* Ring */}
          <View style={styles.ringContainer}>
            <Svg width={size} height={size}>
              <Defs>
                <LinearGradient id="masteredGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Theme.success} />
                  <Stop offset="100%" stopColor="#5A9A68" />
                </LinearGradient>
                <LinearGradient id="learningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Theme.primary} />
                  <Stop offset="100%" stopColor={Theme.primaryDark} />
                </LinearGradient>
                <LinearGradient id="newGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Theme.warning} />
                  <Stop offset="100%" stopColor="#D4A04A" />
                </LinearGradient>
              </Defs>

              {/* Background circle */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={Theme.progressBg}
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Mastered segment */}
              <G transform={`rotate(${-90 + (360 * masteredStart) / 100} ${center} ${center})`}>
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="url(#masteredGradient)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  animatedProps={masteredAnimProps}
                />
              </G>

              {/* Learning segment */}
              <G transform={`rotate(${-90 + (360 * learningStart) / 100} ${center} ${center})`}>
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="url(#learningGradient)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  animatedProps={learningAnimProps}
                />
              </G>

              {/* New segment */}
              <G transform={`rotate(${-90 + (360 * newStart) / 100} ${center} ${center})`}>
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="url(#newGradient)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  animatedProps={newAnimProps}
                />
              </G>
            </Svg>

            {/* Center content */}
            <View style={[styles.centerContent, { width: size, height: size }]}>
              <Typography variant="h1" color={Theme.text} style={styles.totalNumber}>
                {total}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                fiszek łącznie
              </Typography>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <View key={cat.label} style={styles.legendItem}>
                  <View style={[styles.legendIcon, { backgroundColor: cat.lightColor }]}>
                    <Icon size={14} color={cat.color} />
                  </View>
                  <View style={styles.legendText}>
                    <Typography variant="bodySemi" color={Theme.text}>
                      {cat.count}
                    </Typography>
                    <Typography variant="caption" color={Theme.textMuted}>
                      {cat.label}
                    </Typography>
                  </View>
                  <View style={[styles.percentBadge, { backgroundColor: cat.lightColor }]}>
                    <Typography
                      variant="caption"
                      color={cat.color}
                      style={{ fontWeight: '600', fontSize: 11 }}
                    >
                      {Math.round(cat.percent)}%
                    </Typography>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  legend: {
    width: '100%',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundAlt,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  legendIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  percentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
});
