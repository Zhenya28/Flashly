import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedFireIconProps {
  size?: number;
  isActive?: boolean;
}

/**
 * Animated fire icon using lucide Flame with flickering animation
 */
export function AnimatedFireIcon({ size = 32, isActive = true }: AnimatedFireIconProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const flickerOpacity = useSharedValue(1);
  const flickerScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      flickerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 100, easing: Easing.linear }),
          withTiming(1, { duration: 80, easing: Easing.linear }),
          withTiming(0.85, { duration: 120, easing: Easing.linear }),
          withTiming(1, { duration: 60, easing: Easing.linear }),
          withTiming(0.9, { duration: 90, easing: Easing.linear }),
          withTiming(1, { duration: 100, easing: Easing.linear }),
          withTiming(0.8, { duration: 70, easing: Easing.linear }),
          withTiming(1, { duration: 80, easing: Easing.linear }),
        ),
        -1,
        false
      );

      flickerScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(0.97, { duration: 100, easing: Easing.in(Easing.ease) }),
          withTiming(1.03, { duration: 120, easing: Easing.out(Easing.ease) }),
          withTiming(0.98, { duration: 80, easing: Easing.in(Easing.ease) }),
          withTiming(1.04, { duration: 130, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 120, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      flickerOpacity.value = withTiming(1, { duration: 200 });
      flickerScale.value = withTiming(1, { duration: 200 });
    }
  }, [isActive, flickerOpacity, flickerScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: flickerOpacity.value,
    transform: [
      { scaleY: flickerScale.value },
      { scaleX: 1 + (flickerScale.value - 1) * 0.3 },
    ],
  }));

  if (!isActive) {
    return (
      <Flame
        size={size}
        color={Theme.textMuted}
        strokeWidth={2}
      />
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Flame
        size={size}
        color="#FFD700"
        fill="#FFA500"
        strokeWidth={2}
      />
    </Animated.View>
  );
}
