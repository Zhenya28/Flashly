import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius, Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export function CollectionDetailSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Title */}
      <Skeleton width="70%" height={32} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={16} style={{ marginBottom: Spacing.lg }} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={14} />
        </View>
        <View style={styles.statBadge}>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={14} />
        </View>
      </View>

      {/* Study Button */}
      <Skeleton width="100%" height={56} borderRadius={Radius.lg} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }} />

      {/* Cards Section Header */}
      <View style={styles.sectionHeader}>
        <Skeleton width={60} height={20} />
        <Skeleton width={90} height={16} />
      </View>

      {/* Card Items */}
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.cardItem}>
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={14} />
          </View>
          <View style={styles.actions}>
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width={32} height={32} borderRadius={8} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
