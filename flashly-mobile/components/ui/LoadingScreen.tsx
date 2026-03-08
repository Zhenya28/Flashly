import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Star, Zap, Brain, Sparkles, Target } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Enhanced Floating Particle with varied icons
const FloatingParticle = ({ delay, startX, startY, size, color, duration, IconComponent }: {
  delay: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  duration: number;
  IconComponent: React.ComponentType<any>;
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-40, { duration: duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(20, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(-20, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: duration * 3, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
        },
        animatedStyle,
      ]}
    >
      <IconComponent size={size} color={color} fill={color} />
    </Animated.View>
  );
};

// Animated loading dot with color shift
const LoadingDot = ({ color }: { delay: number; color: string }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.3, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />
  );
};

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  mode?: 'quiz' | 'flashcards' | 'default';
}

export const LoadingScreen = ({ 
  title = 'Ładowanie...', 
  subtitle = 'Jeszcze tylko chwilka...',
  mode = 'default' 
}: LoadingScreenProps) => {
  const { colors: Theme, isDark } = useTheme();
  
  const particles = useMemo(() => {
    if (mode === 'flashcards') return [];

    return [
      { delay: 0, startX: width * 0.15, startY: height * 0.25, size: 14, color: Theme.primary, duration: 2000, IconComponent: Sparkles },
      { delay: 200, startX: width * 0.85, startY: height * 0.15, size: 18, color: Theme.warning, duration: 2400, IconComponent: Star },
      { delay: 400, startX: width * 0.1, startY: height * 0.6, size: 12, color: Theme.info, duration: 2200, IconComponent: Brain },
      { delay: 600, startX: width * 0.8, startY: height * 0.55, size: 16, color: Theme.accent4, duration: 2600, IconComponent: Zap },
      { delay: 300, startX: width * 0.25, startY: height * 0.45, size: 10, color: Theme.secondary, duration: 2100, IconComponent: Target },
      { delay: 500, startX: width * 0.9, startY: height * 0.7, size: 14, color: Theme.secondaryLight, duration: 2300, IconComponent: Sparkles },
    ];
  }, [mode, Theme]);

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {particles.map((particle, index) => (
        <FloatingParticle key={index} {...particle} />
      ))}

      <View style={styles.container}>
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.textContainer}>
          <Typography variant="h2" color={Theme.text} style={styles.title}>
            {title}
          </Typography>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <Typography variant="body" color={Theme.textMuted} style={styles.subtitle}>
            {subtitle}
          </Typography>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.dotsContainer}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 150} color={Theme.primary} />
          ))}
        </Animated.View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  textContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  }
});
