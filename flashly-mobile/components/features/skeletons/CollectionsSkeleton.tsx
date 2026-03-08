import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius, Colors } from '@/constants/Colors';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/hooks/useTheme';

export function CollectionsSkeleton() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.content}>
              {/* Top Row: Pills */}
              <View style={styles.row}>
                <Skeleton width={80} height={26} borderRadius={Radius.full} />
                <Skeleton width={90} height={26} borderRadius={Radius.full} />
              </View>

              {/* Title & Desc */}
              <Skeleton width="70%" height={24} style={{ marginTop: 12, marginBottom: 8 }} />
              <Skeleton width="90%" height={16} />

              {/* Bottom Row */}
              <View style={[styles.row, { marginTop: 16 }]}>
                 <Skeleton width={100} height={16} />
                 <Skeleton width={44} height={44} variant="circle" />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    paddingTop: Spacing.sm,
  },
  cardContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
