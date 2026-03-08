import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius, Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export function DashboardSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Header: Greeting + Avatar */}
      <View style={styles.header}>
        <View>
          <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={160} height={28} />
        </View>
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>

      {/* Streak Card */}
      <View style={styles.section}>
        <Skeleton width="100%" height={64} borderRadius={Radius.xl} />
      </View>

      {/* Hero Card */}
      <Skeleton width="100%" height={220} borderRadius={Radius.xl} style={{ marginBottom: Spacing.md }} />

      {/* Weekly Chart */}
      <View style={styles.section}>
        <Skeleton width="100%" height={160} borderRadius={Radius.xl} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Skeleton width={40} height={40} borderRadius={Radius.md} style={{ marginBottom: Spacing.sm }} />
          <Skeleton width={50} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={80} height={14} />
        </View>
        <View style={styles.statCard}>
          <Skeleton width={40} height={40} borderRadius={Radius.md} style={{ marginBottom: Spacing.sm }} />
          <Skeleton width={50} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={80} height={14} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Skeleton width={120} height={16} style={{ marginBottom: Spacing.sm, marginLeft: Spacing.xs }} />
        <Skeleton width="100%" height={200} borderRadius={Radius.xl} style={{ marginBottom: Spacing.lg }} />
        <View style={styles.actionsRow}>
          <Skeleton width="48%" height={110} borderRadius={Radius.xl} />
          <Skeleton width="48%" height={110} borderRadius={Radius.xl} />
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
