import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { CollectionData } from '@/store/collectionStore';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Layers, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface FeaturedCollectionCardProps {
  collection: CollectionData;
}

export const FeaturedCollectionCard = ({ collection }: FeaturedCollectionCardProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/explore/collection/${collection.id}`)}
        style={styles.touchable}
      >
        <LinearGradient
          colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative background icon */}
          <View style={styles.decorativeIcon}>
            <Layers size={100} color="#FFFFFF" strokeWidth={1} style={{ opacity: 0.08 }} />
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Trophy size={12} color="#FFFFFF" />
            <Typography variant="label" color="#FFFFFF" style={styles.badgeText}>
              POPULARNE
            </Typography>
          </View>

          {/* Title */}
          <Typography variant="h2" color="#FFFFFF" style={styles.title} numberOfLines={2}>
            {collection.title}
          </Typography>

          {/* Description */}
          <Typography variant="body" color="rgba(255,255,255,0.85)" numberOfLines={2} style={styles.description}>
            {collection.description || `Profesjonalny zestaw do nauki języka ${collection.target_lang}.`}
          </Typography>

          {/* Bottom row */}
          <View style={styles.bottomRow}>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Typography variant="label" color="#FFFFFF">
                  {collection.source_lang} → {collection.target_lang}
                </Typography>
              </View>
            </View>

            <View style={styles.arrowCircle}>
              <ArrowRight size={18} color={Theme.primary} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  touchable: {
    borderRadius: Radius.xxl,
    ...shadows.glow,
  },
  gradient: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    minHeight: 200,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    transform: [{ rotate: '-15deg' }],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.sm,
  },
  badgeText: {
    letterSpacing: 1,
  },
  title: {
    marginBottom: 6,
  },
  description: {
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
