
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Radius, Spacing } from '@/constants/Colors';
import { CategoryData } from '@/store/collectionStore';
import * as LucideIcons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface CategoryCardProps {
  category: CategoryData;
  onPress: () => void;
}

// Sophisticated gradients for premium feel
const PREMIUM_GRADIENTS: Record<string, readonly [string, string]> = {
  basics: ['#4F46E5', '#818CF8'], // Indigo
  travel: ['#0EA5E9', '#38BDF8'], // Sky Blue
  business: ['#0F172A', '#334155'], // Slate (Professional)
  food: ['#F59E0B', '#FCD34D'], // Amber
  daily: ['#8B5CF6', '#A78BFA'], // Violet
  default: ['#6366F1', '#818CF8'], // Primary Indigo
};

export const CategoryCard = ({ category, onPress }: CategoryCardProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const IconComponent = (LucideIcons[category.icon as keyof typeof LucideIcons] || LucideIcons.HelpCircle) as LucideIcons.LucideIcon;
  const gradientColors = PREMIUM_GRADIENTS[category.slug] || PREMIUM_GRADIENTS.default;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Large Decorative Icon Background */}
        <View style={styles.decorativeIcon}>
           <IconComponent size={80} color="#FFFFFF" strokeWidth={1.5} style={{ opacity: 0.15 }} />
        </View>

        {/* Foreground Content */}
        <View style={styles.contentOverlay}>
           <View style={styles.iconCircle}>
              <IconComponent size={20} color={gradientColors[0]} strokeWidth={2.5} />
           </View>

           <View>
             <Typography variant="h4" color="#FFFFFF" style={styles.title} numberOfLines={1}>
               {category.name}
             </Typography>
             {category.description && (
               <Typography variant="label" color="rgba(255, 255, 255, 0.85)" numberOfLines={1} style={{ marginTop: 2 }}>
                 {category.description}
               </Typography>
             )}
           </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: {
    width: 150,
    height: 190,
    marginRight: Spacing.md,
    borderRadius: Radius.xl,
    ...shadows.md,
  },
  gradient: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    transform: [{ rotate: '-10deg' }],
  },
  contentOverlay: {
    gap: Spacing.sm,
  },
  iconCircle: {
     width: 36,
     height: 36,
     borderRadius: Radius.full,
     backgroundColor: Theme.card,
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 4,
     ...shadows.sm,
  },
  title: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  }
});
