import { TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Radius } from '@/constants/Colors';
import { CategoryData } from '@/store/collectionStore';
import * as LucideIcons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const PREMIUM_GRADIENTS: Record<string, readonly [string, string]> = {
  basics: ['#4F46E5', '#818CF8'],
  travel: ['#0EA5E9', '#38BDF8'],
  business: ['#0F172A', '#334155'],
  food: ['#F59E0B', '#FCD34D'],
  daily: ['#8B5CF6', '#A78BFA'],
  default: ['#6366F1', '#818CF8'],
};

interface CategoryChipProps {
  category: CategoryData;
  isSelected: boolean;
  onPress: () => void;
  index?: number;
}

export const CategoryChip = ({ category, isSelected, onPress, index = 0 }: CategoryChipProps) => {
  const { shadows } = useTheme();
  const IconComponent = (LucideIcons[category.icon as keyof typeof LucideIcons] || LucideIcons.HelpCircle) as LucideIcons.LucideIcon;
  const gradientColors = PREMIUM_GRADIENTS[category.slug] || PREMIUM_GRADIENTS.default;

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).duration(400)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.container, shadows.sm, !isSelected && { opacity: 0.45 }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <IconComponent size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Typography variant="small" color="#FFFFFF" style={styles.text}>
            {category.name}
          </Typography>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.full,
  },
  gradient: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
