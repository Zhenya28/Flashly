import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
  useAnimatedStyle,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  gradientColors?: [string, string];
  backgroundColor?: string;
  children?: React.ReactNode;
  showPercentage?: boolean;
  label?: string;
  duration?: number;
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 10,
  gradientColors: gradientColorsProp,
  backgroundColor: backgroundColorProp,
  children,
  showPercentage = true,
  label,
  duration = 1000,
}: CircularProgressProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const gradientColors = gradientColorsProp ?? [Theme.primary, Theme.primaryDark] as [string, string];
  const backgroundColor = backgroundColorProp ?? Theme.progressBg;
  const animatedProgress = useSharedValue(0);
  const [displayText, setDisplayText] = useState('0');

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const updateDisplay = useCallback((val: number) => {
    setDisplayText(Math.round(val).toString());
  }, []);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 100), {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress, duration]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedProgress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  // Update display text reactively via reanimated
  useDerivedValue(() => {
    runOnJS(updateDisplay)(animatedProgress.value);
    return animatedProgress.value;
  });

  const scaleStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedProgress.value,
      [0, progress * 0.5, progress],
      [0.95, 1.02, 1]
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={scaleStyle}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </SvgLinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
      </Animated.View>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        {children || (
          <View style={styles.defaultCenter}>
            {showPercentage && (
              <Typography variant="h1" color={Theme.text} style={styles.percentageText}>
                {displayText}%
              </Typography>
            )}
            {label && (
              <Typography variant="caption" color={Theme.textMuted}>
                {label}
              </Typography>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCenter: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '700',
  },
});
