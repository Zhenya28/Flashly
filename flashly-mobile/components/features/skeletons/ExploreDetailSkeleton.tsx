import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export function ExploreDetailSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  return (
    <View style={styles.container}>
      {/* Hero Gradient Area */}
      <View style={styles.hero}>
        <Skeleton width="80%" height={30} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.statBadge}>
              <Skeleton width={20} height={20} borderRadius={10} style={{ marginBottom: 4 }} />
              <Skeleton width={30} height={20} style={{ marginBottom: 4 }} />
              <Skeleton width={44} height={12} />
            </View>
          ))}
        </View>

        {/* Download Button */}
        <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: Spacing.xl }} />

        {/* Cards Section Header */}
        <View style={styles.sectionHeader}>
          <Skeleton width={120} height={20} />
          <Skeleton width={60} height={14} />
        </View>

        {/* Card Items */}
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.cardItem}>
            <View style={styles.cardAccent} />
            <View style={styles.cardBody}>
              <Skeleton width="55%" height={18} style={{ marginBottom: 6 }} />
              <Skeleton width="35%" height={14} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  hero: {
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statBadge: {
    flex: 1,
    backgroundColor: Theme.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: Theme.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardAccent: {
    width: 3,
    backgroundColor: Theme.border,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
});
