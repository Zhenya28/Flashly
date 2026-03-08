import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient' | 'hero';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  // Legacy props for backward compatibility
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

/**
 * Modern Card component with gradient support
 * Quizlet-inspired design with subtle shadows and optional gradients
 */
export function GlassCard({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  intensity,
  tint,
  ...props
}: CardProps) {
  const { colors, shadows } = useTheme();

  const baseStyle = {
    backgroundColor: colors.card,
    borderRadius: Radius.xl,
    overflow: 'hidden' as const,
  };

  if (variant === 'gradient') {
    return (
      <View style={[baseStyle, paddingStyles[`padding_${padding}`], style]} {...props}>
        <LinearGradient
          colors={[colors.surface1, colors.surface0]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.gradientOverlay, { borderColor: colors.border + '40' }]} />
        {children}
      </View>
    );
  }

  if (variant === 'hero') {
    return (
      <View style={[baseStyle, { backgroundColor: 'transparent', ...shadows.glow }, paddingStyles[`padding_${padding}`], style]} {...props}>
        <LinearGradient
          colors={[colors.heroGradientStart, colors.heroGradientEnd]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {children}
      </View>
    );
  }

  const variantStyles: Record<string, any> = {
    default: { backgroundColor: colors.card },
    elevated: { backgroundColor: colors.card, ...shadows.md },
    outlined: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  };

  return (
    <View
      style={[
        baseStyle,
        variantStyles[variant] || variantStyles.default,
        paddingStyles[`padding_${padding}`],
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

// Also export as Card for cleaner imports
export const Card = GlassCard;

const styles = StyleSheet.create({
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
});

const paddingStyles = StyleSheet.create({
  padding_none: { padding: 0 },
  padding_xs: { padding: Spacing.xs },
  padding_sm: { padding: Spacing.sm },
  padding_md: { padding: Spacing.md },
  padding_lg: { padding: Spacing.lg },
  padding_xl: { padding: Spacing.xl },
});
