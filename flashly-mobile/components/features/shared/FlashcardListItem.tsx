import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Spacing, Radius } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Volume2, Edit2, Trash2, X } from 'lucide-react-native';
import { GoogleTTSService } from '@/services/tts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { CardStatsBadge } from '@/components/features/stats/CardStatsBadge';
import type { CardState } from '@/lib/fsrs';

interface FlashcardListItemProps {
  front: string;
  back: string;
  index?: number;
  sourceLang?: string;
  targetLang?: string;
  variant?: 'default' | 'readonly' | 'editable';
  onEdit?: () => void;
  onDelete?: () => void;
  onChangeFront?: (text: string) => void;
  onChangeBack?: (text: string) => void;
  animationDelay?: number;
  mastery?: number;
  cardState?: CardState;
  onShowStats?: () => void;
}

const handleSpeak = async (text: string, lang: string = 'EN') => {
  try {
    await GoogleTTSService.speak(text, lang);
  } catch (e) {
    console.error('TTS error:', e);
  }
};

export function FlashcardListItem({
  front,
  back,
  index,
  sourceLang,
  variant = 'default',
  onEdit,
  onDelete,
  onChangeFront,
  onChangeBack,
  animationDelay = 0,
  mastery,
  cardState,
  onShowStats,
}: FlashcardListItemProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const content = variant === 'editable'
    ? renderEditable({ front, back, index, onDelete, onChangeFront, onChangeBack }, Theme, styles)
    : renderDisplayCard({ front, back, sourceLang, variant, onEdit, onDelete, mastery, cardState, onShowStats }, Theme, styles);

  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

// ─── Default & Readonly variants ───

function renderDisplayCard({
  front,
  back,
  sourceLang,
  variant,
  onEdit,
  onDelete,
  mastery,
  cardState,
  onShowStats,
}: Pick<FlashcardListItemProps, 'front' | 'back' | 'sourceLang' | 'variant' | 'onEdit' | 'onDelete' | 'mastery' | 'cardState' | 'onShowStats'>, Theme: any, styles: any) {
  const hasMastery = mastery !== undefined && cardState !== undefined;

  const cardContent = (
    <View style={styles.cardItem}>
      <LinearGradient
        colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accentStrip}
      />
      <View style={styles.cardBody}>
        <View style={{ flex: 1 }}>
          <View style={styles.frontRow}>
            <Typography variant="bodySemi" color={Theme.text} style={{ fontSize: 16 }}>
              {front}
            </Typography>
            {sourceLang && (
              <TouchableOpacity
                onPress={() => handleSpeak(front, sourceLang)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Volume2 size={16} color={Theme.primary} style={{ opacity: 0.8 }} />
              </TouchableOpacity>
            )}
          </View>
          <Typography variant="body" color={Theme.textSecondary} style={{ marginTop: 4 }}>
            {back}
          </Typography>
        </View>

        <View style={styles.rightSection}>
          {hasMastery && (
            <CardStatsBadge mastery={mastery} state={cardState} size={36} />
          )}
          {variant === 'default' && (onEdit || onDelete) && (
            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity onPress={onEdit} style={styles.miniAction}>
                  <Edit2 size={16} color={Theme.textSecondary} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  onPress={onDelete}
                  style={[styles.miniAction, { backgroundColor: Theme.destructiveLight }]}
                >
                  <Trash2 size={16} color={Theme.destructive} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (onShowStats) {
    return (
      <TouchableOpacity onPress={onShowStats} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

// ─── Editable variant ───

function renderEditable({
  front,
  back,
  index,
  onDelete,
  onChangeFront,
  onChangeBack,
}: Pick<FlashcardListItemProps, 'front' | 'back' | 'index' | 'onDelete' | 'onChangeFront' | 'onChangeBack'>, Theme: any, styles: any) {
  return (
    <GlassCard variant="outlined" padding="md">
      {/* Header: index badge + delete */}
      <View style={styles.editableHeader}>
        {index !== undefined && (
          <View style={styles.indexBadge}>
            <Typography variant="caption" color={Theme.primary} style={{ fontWeight: '700' }}>
              #{index + 1}
            </Typography>
          </View>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <X size={14} color={Theme.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Front */}
      <View style={styles.fieldGroup}>
        <Typography variant="label" color={Theme.textSecondary}>PRZÓD</Typography>
        <TextInput
          value={front}
          onChangeText={onChangeFront}
          multiline
          style={styles.inputFront}
        />
      </View>

      <View style={styles.divider} />

      {/* Back */}
      <View style={styles.fieldGroup}>
        <Typography variant="label" color={Theme.textSecondary}>TYŁ</Typography>
        <TextInput
          value={back}
          onChangeText={onChangeBack}
          multiline
          style={styles.inputBack}
        />
      </View>
    </GlassCard>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  // Display card (default + readonly)
  cardItem: {
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.sm,
  },
  accentStrip: {
    width: 3,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  frontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightSection: {
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Editable card
  editableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  indexBadge: {
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.destructiveLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  inputFront: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.text,
    paddingVertical: Spacing.xs,
  },
  inputBack: {
    fontSize: 15,
    color: Theme.textSecondary,
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.border,
    marginVertical: Spacing.sm,
  },
});
