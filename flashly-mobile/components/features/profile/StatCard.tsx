import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  delay = 0,
}: StatCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500)}
      style={styles.container}
    >
      <GlassCard padding="md" style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon size={18} color={iconColor} />
        </View>

        <Typography variant="h2" color={Theme.text} style={styles.value}>
          {value}
        </Typography>
        <Typography variant="caption" color={Theme.textMuted}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color={Theme.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Typography>
        )}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    minHeight: 120,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
});
