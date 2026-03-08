import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { Award, BookOpen, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { CollectionMastery } from '@/lib/mastery';

interface CollectionMasterySummaryProps {
  collectionMastery: CollectionMastery;
}

export function CollectionMasterySummary({ collectionMastery }: CollectionMasterySummaryProps) {
  const { colors: Theme } = useTheme();
  const styles = getStyles(Theme);
  const { averageMastery, masteredCount, learningCount, newCount, totalCards } = collectionMastery;

  if (totalCards === 0) return null;

  const masteredPct = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;
  const learningPct = totalCards > 0 ? (learningCount / totalCards) * 100 : 0;
  const newPct = totalCards > 0 ? (newCount / totalCards) * 100 : 0;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <GlassCard variant="outlined" padding="md">
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="bodySemi" color={Theme.text}>
            Opanowanie
          </Typography>
          <View style={[styles.masteryBadge, { backgroundColor: getMasteryBg(averageMastery, Theme) }]}>
            <Typography variant="bodySemi" color={getMasteryFg(averageMastery, Theme)} style={{ fontSize: 14 }}>
              {averageMastery}%
            </Typography>
          </View>
        </View>

        {/* Stacked progress bar */}
        <View style={styles.progressTrack}>
          {masteredPct > 0 && (
            <View style={[styles.progressSegment, { width: `${masteredPct}%`, backgroundColor: Theme.success, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, ...(learningPct === 0 && newPct === 0 ? { borderTopRightRadius: 6, borderBottomRightRadius: 6 } : {}) }]} />
          )}
          {learningPct > 0 && (
            <View style={[styles.progressSegment, { width: `${learningPct}%`, backgroundColor: Theme.primary, ...(masteredPct === 0 ? { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 } : {}), ...(newPct === 0 ? { borderTopRightRadius: 6, borderBottomRightRadius: 6 } : {}) }]} />
          )}
          {newPct > 0 && (
            <View style={[styles.progressSegment, { width: `${newPct}%`, backgroundColor: Theme.warning, ...(masteredPct === 0 && learningPct === 0 ? { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 } : {}), borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem
            icon={<Award size={12} color={Theme.success} />}
            label="Opanowane"
            count={masteredCount}
            color={Theme.success}
            bgColor={Theme.successLight}
            theme={Theme}
          />
          <LegendItem
            icon={<BookOpen size={12} color={Theme.primary} />}
            label="W nauce"
            count={learningCount}
            color={Theme.primary}
            bgColor={Theme.primaryMuted}
            theme={Theme}
          />
          <LegendItem
            icon={<Sparkles size={12} color={Theme.warning} />}
            label="Nowe"
            count={newCount}
            color={Theme.warning}
            bgColor={Theme.warningLight}
            theme={Theme}
          />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function LegendItem({ icon, label, count, color, bgColor, theme }: {
  icon: React.ReactNode; label: string; count: number; color: string; bgColor: string; theme: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Typography variant="caption" color={theme.textSecondary}>
        {count} {label.toLowerCase()}
      </Typography>
    </View>
  );
}

function getMasteryBg(mastery: number, theme: any): string {
  if (mastery >= 90) return theme.successLight;
  if (mastery >= 60) return theme.primaryMuted;
  if (mastery >= 30) return theme.warningLight;
  return theme.backgroundAlt;
}

function getMasteryFg(mastery: number, theme: any): string {
  if (mastery >= 90) return theme.success;
  if (mastery >= 60) return theme.primary;
  if (mastery >= 30) return theme.warning;
  return theme.textMuted;
}

const getStyles = (Theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  masteryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 6,
    backgroundColor: Theme.progressBg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
