import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Play, Brain, Target, Sparkles, Clock, Calendar } from 'lucide-react-native';
import { CollectionData } from '@/store/collectionStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface SmartHeroWidgetProps {
  collections: CollectionData[];
  getStats: (id: string) => any;
  onPress: (deckId: string, mode: 'flashcards' | 'quiz') => void;
  userName?: string;
}

export const SmartHeroWidget = ({ collections, getStats, onPress, userName = 'Użytkowniku' }: SmartHeroWidgetProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);

  const recommendation = useMemo(() => {
    if (!collections || collections.length === 0) return null;

    let bestDueDeck = null;
    let maxDue = 0;

    for (const deck of collections) {
      const stats = getStats(deck.id);
      if (stats.due > maxDue) {
        maxDue = stats.due;
        bestDueDeck = deck;
      }
    }

    if (bestDueDeck) {
      return {
        type: 'due',
        deck: bestDueDeck,
        count: maxDue,
        title: 'Czas na powtórkę!',
        subtitle: `${maxDue} kart oczekuje na przejrzenie`,
        icon: Clock,
        color: Theme.primary
      };
    }

    const randomDeck = collections[0];
    const stats = getStats(randomDeck.id);
    
    return {
      type: 'practice',
      deck: randomDeck,
      count: stats.total,
      title: `Cześć, ${userName}!`,
      subtitle: 'Może szybka sesja nauki?',
      icon: Sparkles,
      color: Theme.secondary
    };

  }, [collections, getStats, userName]);

  if (!recommendation) {
    return null;
  }

  const { deck, title, subtitle, count, icon: Icon, color } = recommendation;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onPress(deck.id, 'flashcards')}
      style={styles.container}
    >
      <GlassCard variant="elevated" padding="lg" style={styles.card}>
        <LinearGradient
          colors={[color + '15', color + '05', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Icon size={20} color={color} />
          </View>
          <View style={styles.headerText}>
            <Typography variant="h3" color={Theme.text}>
              {title}
            </Typography>
            <Typography variant="caption" color={Theme.textMuted}>
              {subtitle}
            </Typography>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.deckInfo}>
            <Image 
              source={require('@/assets/images/widget-flashcards.png')}
              style={styles.deckImage}
              contentFit="cover"
            />
            <View style={styles.deckDetails}>
              <Typography variant="bodySemi" color={Theme.text}>
                {deck.title}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted} numberOfLines={1}>
                {count} kart w talii
              </Typography>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => onPress(deck.id, 'quiz')}
            >
              <Target size={20} color={color} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.playButton, { backgroundColor: color }]}
              onPress={() => onPress(deck.id, 'flashcards')}
            >
              <Play size={20} color="#FFF" fill="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.cardAlt,
    padding: Spacing.sm,
    paddingRight: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  deckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  deckImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Theme.background,
  },
  deckDetails: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.card,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
});
