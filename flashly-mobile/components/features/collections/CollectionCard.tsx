import { View, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { ChevronRight, BookOpen, Sparkles, Trophy, Clock, Trash2, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { CollectionStats, CollectionData } from '@/store/collectionStore';
import { getLanguageByCode } from '@/components/ui/LanguagePicker';
import Svg, { Circle } from 'react-native-svg';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface CollectionCardProps {
  collection: CollectionData;
  stats: CollectionStats;
  onDelete?: () => void;
}

// Mini circular progress
const MiniProgress = ({
  progress,
  size = 44,
  strokeWidth = 3,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const { colors: Theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on progress
  const getColor = () => {
    if (progress >= 80) return Theme.success;
    if (progress >= 40) return Theme.primary;
    if (progress > 0) return Theme.warning;
    return Theme.textMuted;
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Theme.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Typography variant="caption" color={getColor()} style={{ fontWeight: '700', fontSize: 10 }}>
        {progress}%
      </Typography>
    </View>
  );
};

// Language flag pill
const LanguagePill = ({ sourceCode, targetCode }: { sourceCode: string; targetCode: string }) => {
  const { colors: Theme, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const source = getLanguageByCode(sourceCode || 'PL');
  const target = getLanguageByCode(targetCode || 'EN');

  return (
    <View style={styles.languagePill}>
      {source && (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${source.countryCode.toLowerCase()}.png` }}
          style={styles.flag}
          contentFit="cover"
          transition={200}
        />
      )}
      <Typography variant="caption" color={Theme.textMuted}>→</Typography>
      {target && (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${target.countryCode.toLowerCase()}.png` }}
          style={styles.flag}
          contentFit="cover"
          transition={200}
        />
      )}
    </View>
  );
};

export function CollectionCard({ collection, stats, onDelete }: CollectionCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const [showDelete, setShowDelete] = useState(false);

  const masteryPercentage = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const studiedPercentage = stats.total > 0 ? Math.round((stats.studied / stats.total) * 100) : 0;
  const newCards = stats.total - stats.studied;

  // Status configuration
  const getStatus = () => {
    if (stats.total === 0) {
      return { label: 'Pusta', icon: BookOpen, color: Theme.textMuted, gradient: isDark ? ['#1E1E2E', '#252535'] : ['#F1F5F9', '#E2E8F0'] };
    }
    if (stats.due > 0) {
      return { label: `${stats.due} do powtórki`, icon: Clock, color: Theme.primary, gradient: isDark ? [Theme.primaryMuted, 'rgba(99,102,241,0.15)'] : [Theme.primaryMuted, '#E0E7FF'] };
    }
    if (newCards > 0 && stats.studied === 0) {
      return { label: `${stats.total} nowych`, icon: Sparkles, color: Theme.warning, gradient: isDark ? [Theme.warningLight, 'rgba(245,158,11,0.15)'] : [Theme.warningLight, '#FEF3C7'] };
    }
    if (masteryPercentage >= 80) {
      return { label: 'Opanowane!', icon: Trophy, color: Theme.success, gradient: isDark ? [Theme.successLight, 'rgba(16,185,129,0.15)'] : [Theme.successLight, '#D1FAE5'] };
    }
    if (newCards > 0) {
      return { label: `${newCards} nowych`, icon: Zap, color: Theme.warning, gradient: isDark ? [Theme.warningLight, 'rgba(245,158,11,0.15)'] : [Theme.warningLight, '#FEF3C7'] };
    }
    return { label: 'Gotowe', icon: Trophy, color: Theme.success, gradient: isDark ? [Theme.successLight, 'rgba(16,185,129,0.15)'] : [Theme.successLight, '#D1FAE5'] };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const handlePress = () => {
    if (showDelete) {
      setShowDelete(false);
    } else {
      router.push(`/collections/${collection.id}`);
    }
  };

  const handleLongPress = () => {
    if (onDelete) {
      setShowDelete(true);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardInner}>
          {/* Card content */}
          <View style={styles.cardContent}>
          
          {/* Top row: Languages + Status badge */}
          <View style={styles.topRow}>
            <LanguagePill 
              sourceCode={collection.source_lang || 'PL'} 
              targetCode={collection.target_lang || 'EN'} 
            />
            
            <LinearGradient
              colors={status.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <StatusIcon size={12} color={status.color} />
              <Typography variant="caption" color={status.color} style={styles.statusText}>
                {status.label}
              </Typography>
            </LinearGradient>
          </View>

          {/* Title */}
          <Typography variant="h3" color={Theme.text} numberOfLines={1} style={styles.title}>
            {collection.title}
          </Typography>

          {/* Description or auto-generated note */}
          <Typography variant="caption" color={Theme.textMuted} numberOfLines={1} style={styles.description}>
            {collection.description || `Wygenerowano automatycznie z tematu: ${collection.title.toLowerCase()}`}
          </Typography>

          {/* Bottom row: Stats + Progress/Delete */}
          <View style={styles.bottomRow}>
            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: Theme.primary }]} />
                <Typography variant="caption" color={Theme.textSecondary}>
                  {stats.total} fiszek
                </Typography>
              </View>
              
              {stats.studied > 0 && (
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: Theme.success }]} />
                  <Typography variant="caption" color={Theme.textSecondary}>
                    {stats.studied} przerobiono
                  </Typography>
                </View>
              )}
            </View>

            {/* Right side: Progress circle or Delete button */}
            <View style={styles.rightSide}>
              {showDelete && onDelete ? (
                <TouchableOpacity
                  onPress={() => {
                    setShowDelete(false);
                    onDelete();
                  }}
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <>
                  <MiniProgress 
                    progress={studiedPercentage} 
                    strokeWidth={3}
                    size={44}
                  />
                  <View style={styles.chevron}>
                    <ChevronRight size={16} color={Theme.textMuted} />
                  </View>
                </>
              )}
            </View>
          </View>
          </View>
        </View>
      </Pressable>

      {/* Delete hint */}
      {showDelete && (
        <View style={styles.deleteHint}>
          <Typography variant="caption" color={Theme.textMuted}>
            Kliknij kosz aby usunąć
          </Typography>
        </View>
      )}
    </View>
  );
}

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
    overflow: 'hidden', // Clip the image at top corners
  },
  cardPressed: {
    opacity: 0.98,
    transform: [{ scale: 0.99 }],
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
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  flag: {
    width: 20,
    height: 14,
    borderRadius: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 11,
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

  // Right side
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Delete
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Theme.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHint: {
    alignItems: 'center',
    marginTop: 6,
  },
});
