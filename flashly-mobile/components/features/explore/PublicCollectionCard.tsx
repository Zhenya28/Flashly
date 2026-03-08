import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { Radius, Spacing } from '@/constants/Colors';
import { CollectionData } from '@/store/collectionStore';
import { Download, Check, Sparkles, BookOpen } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { getLanguageByCode } from '@/components/ui/LanguagePicker';

interface PublicCollectionCardProps {
  collection: CollectionData;
  onClone: () => Promise<void>;
  index?: number;
}

// Language flag pill — same as CollectionCard
const LanguagePill = ({ sourceCode, targetCode }: { sourceCode: string; targetCode: string }) => {
  const { colors: Theme, shadows } = useTheme();
  const source = getLanguageByCode(sourceCode || 'PL');
  const target = getLanguageByCode(targetCode || 'EN');

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Theme.backgroundAlt,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.full,
    }}>
      {source?.countryCode && (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${source.countryCode.toLowerCase()}.png` }}
          style={{ width: 20, height: 14, borderRadius: 2 }}
          contentFit="cover"
          transition={200}
        />
      )}
      <Typography variant="caption" color={Theme.textMuted}>→</Typography>
      {target?.countryCode && (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${target.countryCode.toLowerCase()}.png` }}
          style={{ width: 20, height: 14, borderRadius: 2 }}
          contentFit="cover"
          transition={200}
        />
      )}
    </View>
  );
};

export const PublicCollectionCard = ({ collection, onClone, index = 0 }: PublicCollectionCardProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const [isCloning, setIsCloning] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const isNew = collection.created_at &&
    Date.now() - new Date(collection.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  const cardCount = collection.flashcard_count ?? 0;

  const handlePress = () => {
    router.push(`/explore/collection/${collection.id}`);
  };

  const handleClone = useCallback(async () => {
    if (isCloning || isDownloaded) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCloning(true);
    try {
      await onClone();
      setIsDownloaded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCloning(false);
    }
  }, [isCloning, isDownloaded, onClone]);

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 80).duration(500).springify()}>
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.98}
          onPress={handlePress}
          style={styles.card}
        >
          <View style={styles.cardInner}>
            <View style={styles.cardContent}>

              {/* Top row: Flags + Badge */}
              <View style={styles.topRow}>
                <LanguagePill
                  sourceCode={collection.source_lang || 'PL'}
                  targetCode={collection.target_lang || 'EN'}
                />

                {isNew && (
                  <Animated.View entering={FadeIn.delay(300)} style={styles.badgeNew}>
                    <Sparkles size={10} color="#F59E0B" />
                    <Typography variant="label" color={Theme.warningDark} style={styles.badgeLabel}>
                      NOWE
                    </Typography>
                  </Animated.View>
                )}
              </View>

              {/* Title */}
              <Typography variant="h3" color={Theme.text} numberOfLines={1} style={styles.title}>
                {collection.title}
              </Typography>

              {/* Description */}
              <Typography variant="caption" color={Theme.textMuted} numberOfLines={1} style={styles.description}>
                {collection.description || `Profesjonalny zestaw do nauki języka ${collection.target_lang}.`}
              </Typography>

              {/* Bottom row: Stats + Actions */}
              <View style={styles.bottomRow}>
                {/* Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: Theme.primary }]} />
                    <Typography variant="caption" color={Theme.textSecondary}>
                      {cardCount} fiszek
                    </Typography>
                  </View>
                </View>

                {/* Clone button */}
                <TouchableOpacity
                  onPress={handleClone}
                  activeOpacity={0.8}
                  disabled={isCloning || isDownloaded}
                  style={[
                    styles.actionButton,
                    isDownloaded ? styles.actionButtonSuccess : styles.actionButtonPrimary,
                  ]}
                >
                  {isCloning ? (
                    <ActivityIndicator size="small" color={Theme.primary} />
                  ) : isDownloaded ? (
                    <Animated.View entering={ZoomIn.springify()}>
                      <Check size={18} color={Theme.successDark} strokeWidth={3} />
                    </Animated.View>
                  ) : (
                    <View style={styles.downloadContent}>
                      <Typography variant="label" color={Theme.primary} style={styles.btnText}>POBIERZ</Typography>
                      <Download size={14} color={Theme.primary} strokeWidth={2.5} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    borderRadius: Radius.xl,
    ...shadows.card,
    backgroundColor: Theme.card,
  },
  cardInner: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.lg,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Title & description
  title: {
    marginBottom: 4,
    fontSize: 18,
  },
  description: {
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Action button
  actionButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  actionButtonPrimary: {
    backgroundColor: Theme.primaryMuted,
  },
  actionButtonSuccess: {
    backgroundColor: Theme.successLight,
    paddingHorizontal: 12,
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
