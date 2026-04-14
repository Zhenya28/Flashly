import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { Clock, Sparkles, ChevronRight, Brain, Target } from 'lucide-react-native';
import { Spacing, Radius } from '@/constants/Colors';
import { CollectionData, CollectionStats } from '@/store/collectionStore';
import { getLanguageByCode } from '@/components/ui/LanguagePicker';
import { useTheme } from '@/hooks/useTheme';

interface TodayDeckCardProps {
  collection: CollectionData;
  stats: CollectionStats;
  onPress: () => void;
  isQuizMode?: boolean;
}

function TodayDeckCard({ collection, stats, onPress, isQuizMode }: TodayDeckCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const hasDue = stats.due > 0;
  const hasNew = stats.newCards > 0;
  const sourceLang = getLanguageByCode(collection.source_lang || 'PL');
  const targetLang = getLanguageByCode(collection.target_lang || 'EN');

  const getStatusConfig = () => {
    if (isQuizMode) {
      return {
        icon: Target,
        text: `${stats.total} słów`,
        color: Theme.success,
        bgColor: Theme.successLight,
      };
    }
    if (hasDue) {
      return {
        icon: Clock,
        text: `${stats.due} do powtórki`,
        color: Theme.primary,
        bgColor: Theme.primaryMuted,
      };
    }
    if (hasNew) {
      return {
        icon: Sparkles,
        text: `${stats.newCards} nowych`,
        color: Theme.warning,
        bgColor: Theme.warningLight,
      };
    }
    return {
      icon: Brain,
      text: `${stats.total} fiszek`,
      color: Theme.textSecondary,
      bgColor: Theme.backgroundAlt,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <TouchableOpacity
      style={styles.deckCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />

      <View style={styles.flagsRow}>
        {sourceLang && (
          <View style={styles.flagContainer}>
            <Image
              source={{ uri: `https://flagcdn.com/w40/${sourceLang.countryCode.toLowerCase()}.png` }}
              style={styles.flag}
              contentFit="cover"
            />
          </View>
        )}
        <Typography variant="caption" color={Theme.textMuted}>→</Typography>
        {targetLang && (
          <View style={styles.flagContainer}>
            <Image
              source={{ uri: `https://flagcdn.com/w40/${targetLang.countryCode.toLowerCase()}.png` }}
              style={styles.flag}
              contentFit="cover"
            />
          </View>
        )}
      </View>

      <Typography
        variant="bodySemi"
        color={Theme.text}
        numberOfLines={2}
        style={styles.deckTitle}
      >
        {collection.title}
      </Typography>

      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
        <StatusIcon size={12} color={statusConfig.color} />
        <Typography variant="caption" color={statusConfig.color} style={styles.statusText}>
          {statusConfig.text}
        </Typography>
      </View>
    </TouchableOpacity>
  );
}

interface TodayDeckScrollProps {
  collections: CollectionData[];
  getStats: (id: string) => CollectionStats;
  onDeckPress: (id: string) => void;
  onSeeAllPress?: () => void;
  isQuizMode?: boolean;
}

export function TodayDeckScroll({
  collections,
  getStats,
  onDeckPress,
  onSeeAllPress,
  isQuizMode = false,
}: TodayDeckScrollProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const todayDecks = collections
    .map(c => ({ collection: c, stats: getStats(c.id) }))
    .filter(({ stats }) => stats.total > 0)
    .sort((a, b) => {
      if (isQuizMode) {
        return b.stats.total - a.stats.total;
      }
      if (a.stats.due > 0 && b.stats.due === 0) return -1;
      if (a.stats.due === 0 && b.stats.due > 0) return 1;
      if (a.stats.due !== b.stats.due) return b.stats.due - a.stats.due;
      return b.stats.newCards - a.stats.newCards;
    })
    .slice(0, 10);

  if (todayDecks.length === 0) {
    return null;
  }

  const accentColor = isQuizMode ? Theme.success : Theme.primary;
  const accentBgColor = isQuizMode ? Theme.successLight : Theme.primaryMuted;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconContainer, { backgroundColor: accentBgColor }]}>
            {isQuizMode ? (
              <Target size={16} color={accentColor} />
            ) : (
              <Clock size={16} color={accentColor} />
            )}
          </View>
          <Typography variant="h3" color={Theme.text}>
            {isQuizMode ? 'Wybierz kolekcję' : 'Na dziś'}
          </Typography>
        </View>

        {onSeeAllPress && collections.length > 3 && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={onSeeAllPress}
            activeOpacity={0.7}
          >
            <Typography variant="bodySemi" color={accentColor}>
              Zobacz wszystkie
            </Typography>
            <ChevronRight size={16} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={148}
      >
        {todayDecks.map(({ collection, stats }) => (
          <TodayDeckCard
            key={collection.id}
            collection={collection}
            stats={stats}
            onPress={() => onDeckPress(collection.id)}
            isQuizMode={isQuizMode}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  // Deck card
  deckCard: {
    width: 140,
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: Theme.borderLight,
  },
  statusDot: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Flags
  flagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  flagContainer: {
    width: 22,
    height: 16,
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  flag: {
    width: '100%',
    height: '100%',
  },

  // Title
  deckTitle: {
    minHeight: 36,
    marginBottom: Spacing.sm,
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 10,
  },
});
