import React from 'react';
import { View, Modal, Pressable, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { X, Brain, BarChart3, RotateCcw, AlertTriangle, Calendar, Clock } from 'lucide-react-native';
import { CircularProgress } from './CircularProgress';
import {
  getCardMasteryInfo,
  getStateLabel,
  getStateColor,
  getMasteryColor,
  getDifficultyLabel,
  formatStability,
  formatNextReview,
  formatLastReview,
} from '@/lib/mastery';
import type { FSRSCard } from '@/lib/fsrs';

interface CardStatsSheetProps {
  visible: boolean;
  onClose: () => void;
  front: string;
  back: string;
  fsrsCard: FSRSCard;
}

export function CardStatsSheet({ visible, onClose, front, back, fsrsCard }: CardStatsSheetProps) {
  const { colors: Theme, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);

  const info = getCardMasteryInfo(fsrsCard);
  const masteryColor = getMasteryColor(info.mastery, Theme);
  const stateColor = getStateColor(info.state, Theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySemi" color={Theme.text} style={{ fontSize: 18 }} numberOfLines={2}>
                  {front}
                </Typography>
                <Typography variant="body" color={Theme.textSecondary} style={{ marginTop: 4 }} numberOfLines={1}>
                  {back}
                </Typography>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mastery Ring */}
            <View style={styles.ringSection}>
              <CircularProgress
                progress={info.mastery}
                size={140}
                strokeWidth={12}
                gradientColors={[masteryColor, masteryColor]}
                duration={800}
              />
            </View>

            {/* State badge */}
            <View style={styles.stateBadgeRow}>
              <View style={[styles.stateBadge, { backgroundColor: stateColor + '20' }]}>
                <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
                <Typography variant="bodySemi" color={stateColor} style={{ fontSize: 13 }}>
                  {getStateLabel(info.state)}
                </Typography>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCell
                icon={<Brain size={16} color={Theme.primary} />}
                label="Trudność"
                value={getDifficultyLabel(info.difficulty)}
                subValue={`${info.difficulty.toFixed(1)} / 10`}
                theme={Theme}
              />
              <StatCell
                icon={<BarChart3 size={16} color={Theme.success} />}
                label="Stabilność"
                value={formatStability(info.stability)}
                theme={Theme}
              />
              <StatCell
                icon={<RotateCcw size={16} color={Theme.primary} />}
                label="Powtórzenia"
                value={`${info.reps}`}
                theme={Theme}
              />
              <StatCell
                icon={<AlertTriangle size={16} color={Theme.warning} />}
                label="Pomyłki"
                value={`${info.lapses}`}
                theme={Theme}
              />
              <StatCell
                icon={<Calendar size={16} color={Theme.info} />}
                label="Następna powtórka"
                value={formatNextReview(info.nextReview)}
                theme={Theme}
              />
              <StatCell
                icon={<Clock size={16} color={Theme.textMuted} />}
                label="Ostatnia powtórka"
                value={formatLastReview(info.lastReview)}
                theme={Theme}
              />
            </View>

            {/* Current interval */}
            {info.intervalDays > 0 && (
              <View style={styles.intervalRow}>
                <Typography variant="caption" color={Theme.textMuted}>
                  Aktualny odstęp
                </Typography>
                <Typography variant="bodySemi" color={info.isOverdue ? Theme.destructive : Theme.text}>
                  {info.intervalDays} {info.intervalDays === 1 ? 'dzień' : 'dni'}
                  {info.isOverdue ? ' (zaległa)' : ''}
                </Typography>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatCell({ icon, label, value, subValue, theme }: {
  icon: React.ReactNode; label: string; value: string; subValue?: string; theme: any;
}) {
  return (
    <View style={{
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.backgroundAlt,
      borderRadius: Radius.md,
      padding: 12,
      gap: 6,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Typography variant="caption" color={theme.textMuted}>{label}</Typography>
      </View>
      <Typography variant="bodySemi" color={theme.text} style={{ fontSize: 15 }}>
        {value}
      </Typography>
      {subValue && (
        <Typography variant="caption" color={theme.textMuted} style={{ fontSize: 11 }}>
          {subValue}
        </Typography>
      )}
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: Theme.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Theme.border,
    ...shadows.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stateBadgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.md,
    padding: 14,
  },
});
