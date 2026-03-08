import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export function LearningSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  return (
    <View style={styles.container}>
      {/* Toggle Bar */}
      <View style={styles.toggleBar}>
        <Skeleton width="48%" height={40} borderRadius={Radius.md} />
        <Skeleton width="48%" height={40} borderRadius={Radius.md} />
      </View>

      {/* Main Widget Card */}
      <View style={styles.widget}>
        {/* Image area */}
        <Skeleton width="100%" height={150} borderRadius={0} />

        {/* Content */}
        <View style={styles.widgetContent}>
          <Skeleton width={180} height={24} style={{ marginBottom: 6 }} />
          <Skeleton width="90%" height={16} style={{ marginBottom: Spacing.md }} />

          {/* Deck Selector */}
          <View style={styles.deckSelector}>
            <Skeleton width={36} height={36} borderRadius={Radius.md} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
              <Skeleton width={140} height={16} />
            </View>
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width={40} height={20} style={{ marginBottom: 4 }} />
                <Skeleton width={70} height={12} />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width={40} height={20} style={{ marginBottom: 4 }} />
                <Skeleton width={70} height={12} />
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <Skeleton width="100%" height={50} borderRadius={Radius.xl} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  toggleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    padding: 3,
    marginBottom: Spacing.md,
    ...shadows.sm,
  },
  widget: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...shadows.md,
    borderWidth: 1,
    borderColor: Theme.borderLight,
  },
  widgetContent: {
    padding: Spacing.lg,
  },
  deckSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Theme.border,
    marginHorizontal: 8,
  },
});
