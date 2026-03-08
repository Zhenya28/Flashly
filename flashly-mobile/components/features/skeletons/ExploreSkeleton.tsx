import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius, Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export function ExploreSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <View style={styles.container}>
      {/* Featured Card Skeleton */}
      <View style={styles.featuredCard}>
        <Skeleton width={90} height={24} borderRadius={Radius.full} style={{ marginBottom: 12 }} />
        <Skeleton width="80%" height={26} borderRadius={Radius.sm} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} borderRadius={Radius.sm} style={{ marginBottom: 20 }} />
        <View style={styles.row}>
          <Skeleton width={80} height={28} borderRadius={Radius.full} />
          <Skeleton width={60} height={28} borderRadius={Radius.full} />
          <View style={{ flex: 1 }} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>

      {/* Category Chips Skeleton */}
      <View style={styles.chipsRow}>
        {[100, 80, 110, 90].map((w, i) => (
          <Skeleton key={i} width={w} height={44} borderRadius={Radius.full} />
        ))}
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Skeleton width={160} height={22} borderRadius={Radius.sm} />
      </View>

      {/* Collection Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.cardSkeleton}>
          <Skeleton width={64} height={74} borderRadius={Radius.lg} />
          <View style={styles.cardContent}>
            <Skeleton width="70%" height={18} borderRadius={Radius.sm} style={{ marginBottom: 8 }} />
            <Skeleton width="90%" height={14} borderRadius={Radius.sm} style={{ marginBottom: 12 }} />
            <View style={styles.row}>
              <Skeleton width={70} height={14} borderRadius={Radius.sm} />
              <View style={{ flex: 1 }} />
              <Skeleton width={80} height={32} borderRadius={Radius.full} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  featuredCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(91,108,240,0.08)',
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardSkeleton: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
