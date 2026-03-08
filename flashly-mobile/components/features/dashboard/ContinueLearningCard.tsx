import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Play, TrendingUp } from 'lucide-react-native';
import { Spacing, Radius } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface ContinueLearningCardProps {
  collectionTitle: string;
  progressPercentage: number;
  dueCards: number;
  onPress: () => void;
}

/**
 * "Wróć do nauki" card - Quizlet-style continue learning hero card
 * Shows current collection progress with a prominent CTA button
 */
export function ContinueLearningCard({
  collectionTitle,
  progressPercentage,
  dueCards,
  onPress,
}: ContinueLearningCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const clampedProgress = Math.min(100, Math.max(0, progressPercentage));
  const isComplete = dueCards === 0;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
      <LinearGradient
        colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        {/* Header with icon */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <TrendingUp size={16} color={Theme.heroGradientStart} />
          </View>
          <Typography variant="caption" color="rgba(255,255,255,0.8)" style={styles.label}>
            {isComplete ? 'Wszystko zrobione!' : 'Wróć do nauki'}
          </Typography>
        </View>

        {/* Collection title */}
        <Typography variant="h2" color="#FFFFFF" numberOfLines={1} style={styles.title}>
          {collectionTitle}
        </Typography>

        {/* Progress bar - green color */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${clampedProgress}%` }]} />
          </View>
          <Typography variant="bodySemi" color="#FFFFFF" style={styles.progressText}>
            {clampedProgress}%
          </Typography>
        </View>

        {/* Stats and CTA row */}
        <View style={styles.footer}>
          <View style={styles.footerText}>
            <Typography variant="body" color="rgba(255,255,255,0.85)" numberOfLines={1}>
              {dueCards > 0 ? `${dueCards} fiszek do powtórki` : 'Świetna robota!'}
            </Typography>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={onPress} activeOpacity={0.8}>
            <Typography variant="bodySemi" color={Theme.heroGradientStart}>
              {isComplete ? 'Powtórz' : 'Kontynuuj'}
            </Typography>
            <Play size={14} color={Theme.heroGradientStart} fill={Theme.heroGradientStart} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...shadows.lg,
    marginBottom: Spacing.lg,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Decorative circles for visual interest
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    backgroundColor: Theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },

  // Title
  title: {
    marginBottom: Spacing.md,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.card,
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
    textAlign: 'right',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  footerText: {
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
});
