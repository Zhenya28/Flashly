import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Play, Brain, Sparkles, Zap } from 'lucide-react-native';
import { CollectionData } from '@/store/collectionStore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');

interface GlobalBrainWidgetProps {
  collections: CollectionData[];
  getStats: (id: string) => any;
  onPressGlobalReview: () => void;
  onPressBrowse?: () => void; // New optional prop
  userName?: string;
}

export const GlobalBrainWidget = ({ collections, getStats, onPressGlobalReview, onPressBrowse, userName = 'Użytkowniku' }: GlobalBrainWidgetProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  
  // Calculate Global Stats
  const globalStats = useMemo(() => {
    let totalDue = 0;
    let totalCards = 0;
    
    if (collections) {
      collections.forEach(c => {
        const stats = getStats(c.id);
        if (stats) {
          totalDue += stats.due || 0;
          totalCards += stats.total || 0;
        }
      });
    }

    return { totalDue, totalCards };
  }, [collections, getStats]);

  const hasDueCards = globalStats.totalDue > 0;
  
  // Dynamic Content based on State
  const content = hasDueCards ? {
    title: 'Twój Mózg Wzywa!',
    subtitle: `Masz ${globalStats.totalDue} kart do powtórki ze wszystkich talii.`,
    buttonText: 'Rozpocznij Globalną Sesję',
    onPress: onPressGlobalReview,
    icon: Brain,
    color: Theme.primary,
    gradient: [Theme.primary, '#4F46E5'] // Indigo gradient
  } : {
    title: 'Wszystko na bieżąco!',
    subtitle: `Wszystkie ${globalStats.totalCards} kart opanowane. Może nauka nowych?`,
    buttonText: 'Przeglądaj Talie',
    onPress: onPressBrowse || onPressGlobalReview, // Fallback if regular browse not provided
    icon: Sparkles,
    color: Theme.success,
    gradient: [Theme.success, '#10B981'] // Emerald gradient
  };

  const Icon = content.icon;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={content.onPress}
      style={styles.container}
    >
      <GlassCard variant="elevated" padding="none" style={styles.card}>
        {/* Cinematic Background Gradient */}
        <LinearGradient
          colors={[...content.gradient, 'transparent'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}
          locations={[0, 1]}
        />
        
        <View style={styles.contentContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: content.color + '15' }]}>
              <Icon size={24} color={content.color} />
            </View>
            <View style={styles.textContainer}>
              <Typography variant="h3" color={Theme.text}>{content.title}</Typography>
              <Typography variant="caption" color={Theme.textMuted} numberOfLines={2}>
                {content.subtitle}
              </Typography>
            </View>
          </View>

          {/* Action Button Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: content.color }]}
              onPress={content.onPress}
              activeOpacity={0.8}
            >
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Typography variant="bodySemi" color="#FFFFFF">
                {content.buttonText}
              </Typography>
            </TouchableOpacity>

            {/* Quick Stats Badge (Optional) */}
            {hasDueCards && (
              <View style={styles.statBadge}>
                <Zap size={14} color={Theme.warning} fill={Theme.warning} />
                <Typography variant="caption" color={Theme.textSecondary} style={{ fontWeight: '700' }}>
                  {globalStats.totalDue}
                </Typography>
              </View>
            )}
          </View>
        </View>

        {/* Decorative background element */}
        <View style={[styles.decorativeCircle, { backgroundColor: content.color }]} />
      </GlassCard>
    </TouchableOpacity>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
    minHeight: 160,
  },
  contentContainer: {
    padding: Spacing.lg,
    zIndex: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  mainButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...shadows.md,
  },
  statBadge: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.05,
    zIndex: 0,
  }
});
