import { StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface GradientBackgroundProps extends ViewProps {
  variant?: 'subtle' | 'soft' | 'hero' | 'card';
  colors?: string[];
}

/**
 * Gradient Background component
 * Provides consistent gradient backgrounds — theme-aware
 */
export function GradientBackground({
  variant = 'subtle',
  colors: colorsProp,
  style,
  children,
  ...props
}: GradientBackgroundProps) {
  const { colors, isDark } = useTheme();
  const gradientColors = colorsProp || getGradientColors(variant, isDark, colors);

  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.25, 0.5, 0.75, 1]}
      />
      {children}
    </View>
  );
}

function getGradientColors(
  variant: GradientBackgroundProps['variant'],
  isDark: boolean,
  colors: typeof Colors.light
): string[] {
  if (isDark) {
    switch (variant) {
      case 'subtle':
        return [
          '#0D0D1A',
          '#111128',
          '#0F0F20',
          '#13132A',
          '#0D0D18',
        ];
      case 'soft':
        return [
          colors.gradientEnd,
          colors.gradientStart,
          colors.backgroundGradientEnd,
        ];
      case 'hero':
        return [
          colors.heroGradientStart,
          colors.heroGradientEnd,
        ];
      case 'card':
        return [
          colors.surface2,
          colors.surface1,
        ];
      default:
        return [
          colors.backgroundGradientStart,
          colors.backgroundGradientEnd,
        ];
    }
  }

  // Light mode
  switch (variant) {
    case 'subtle':
      return [
        '#E8F4FD',
        '#F0E6FA',
        '#FCE7F3',
        '#F8FAFC',
        '#FFFFFF',
      ];
    case 'soft':
      return [
        colors.gradientEnd,
        colors.gradientStart,
        colors.backgroundGradientEnd,
      ];
    case 'hero':
      return [
        colors.heroGradientStart,
        colors.heroGradientEnd,
      ];
    case 'card':
      return [
        colors.surface2,
        colors.surface1,
      ];
    default:
      return [
        colors.backgroundGradientStart,
        colors.backgroundGradientEnd,
      ];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
