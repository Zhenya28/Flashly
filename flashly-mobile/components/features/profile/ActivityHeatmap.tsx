import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { ActivityDay } from '@/services/profile';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface ActivityHeatmapProps {
  data: ActivityDay[];
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const WEEKS_TO_SHOW = 12;

const getLevelColors = (Theme: any): Record<0 | 1 | 2 | 3 | 4, string> => ({
  0: Theme.progressBg,
  1: Theme.primaryMuted,
  2: Theme.primaryLight,
  3: Theme.primary,
  4: Theme.primaryDark,
});

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const LEVEL_COLORS = getLevelColors(Theme);
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <GlassCard padding="lg">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Activity size={18} color={Theme.primary} />
            </View>
            <Typography variant="bodySemi" color={Theme.text}>
              Aktywność
            </Typography>
          </View>
          <Typography variant="caption" color={Theme.textMuted}>
            0 powtórek
          </Typography>
        </View>
        <View style={styles.emptyState}>
          <Typography variant="caption" color={Theme.textMuted}>
            Brak danych o aktywności
          </Typography>
        </View>
      </GlassCard>
    );
  }

  // Organize data into weeks
  const weeks = useMemo(() => {
    const result: ActivityDay[][] = [];
    let currentWeek: ActivityDay[] = [];

    const firstDate = new Date(data[0].date);
    const dayOfWeek = firstDate.getDay();

    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 });
    }

    data.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: 0 });
      }
      result.push(currentWeek);
    }

    return result.slice(-WEEKS_TO_SHOW);
  }, [data]);

  const totalContributions = useMemo(() => {
    return data.reduce((sum, day) => sum + day.count, 0);
  }, [data]);

  const dayLabels = ['', 'Pn', '', 'Śr', '', 'Pt', ''];

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
      <GlassCard padding="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Activity size={18} color={Theme.primary} />
            </View>
            <Typography variant="bodySemi" color={Theme.text}>
              Aktywność
            </Typography>
          </View>
          <View style={styles.countBadge}>
            <Typography variant="bodySemi" color={Theme.primary}>
              {totalContributions}
            </Typography>
            <Typography variant="caption" color={Theme.textMuted}>
              powtórek
            </Typography>
          </View>
        </View>

        {/* Heatmap Grid */}
        <View style={styles.gridContainer}>
          {/* Day labels */}
          <View style={[styles.dayLabels, { height: 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP }]}>
            {dayLabels.map((label, i) => (
              <Typography
                key={`label-${i}`}
                variant="caption"
                color={Theme.textMuted}
                style={{ fontSize: 9, lineHeight: CELL_SIZE }}
              >
                {label}
              </Typography>
            ))}
          </View>

          {/* Grid of weeks */}
          <View style={styles.weeksContainer}>
            {weeks.map((week, weekIndex) => (
              <View
                key={`week-${weekIndex}`}
                style={[styles.weekColumn, { marginRight: weekIndex < weeks.length - 1 ? CELL_GAP : 0 }]}
              >
                {week.map((day, dayIndex) => (
                  <Animated.View
                    key={`cell-${weekIndex}-${dayIndex}`}
                    entering={FadeIn.delay(weekIndex * 20 + dayIndex * 5).duration(200)}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: day.date ? LEVEL_COLORS[day.level] : 'transparent',
                        marginBottom: dayIndex < 6 ? CELL_GAP : 0,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Typography variant="caption" color={Theme.textMuted} style={styles.legendLabel}>
            Mniej
          </Typography>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <View
              key={`legend-${level}`}
              style={[styles.legendCell, { backgroundColor: LEVEL_COLORS[level] }]}
            />
          ))}
          <Typography variant="caption" color={Theme.textMuted} style={styles.legendLabel}>
            Więcej
          </Typography>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  dayLabels: {
    marginRight: Spacing.sm,
    justifyContent: 'space-around',
  },
  weeksContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  weekColumn: {
    flexDirection: 'column',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    marginHorizontal: 4,
  },
});
