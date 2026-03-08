import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  decimals?: number;
}

const FONT_SIZES = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
};

export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  color,
  size = 'lg',
  decimals = 0,
}: AnimatedCounterProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const effectiveColor = color || Theme.text;
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Reset scale for bounce effect
    scale.value = withSpring(1.05, { damping: 10, stiffness: 100 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

    // Animate the number
    const startValue = animatedValue.value;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);
      animatedValue.value = currentValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Typography
        variant="h1"
        color={color}
        style={{ fontSize: FONT_SIZES[size], fontWeight: '700' }}
      >
        {prefix}{formattedValue}{suffix}
      </Typography>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
