import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { AnimatedFireIcon } from '@/components/ui/AnimatedFireIcon';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface StreakWidgetProps {
  days: number;
  onPress?: () => void;
}

export function StreakWidget({ days, onPress }: StreakWidgetProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const isActive = days > 0;

  if (isActive) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <LinearGradient
          colors={[Theme.streakGradientStart, Theme.streakGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.containerActive}
        >
          <View style={styles.fireWrapper}>
            <AnimatedFireIcon size={22} isActive={true} />
          </View>
          <Typography variant="small" style={styles.textActive}>
            {days} {days === 1 ? 'dzień' : 'dni'}
          </Typography>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.containerInactive}>
      <AnimatedFireIcon size={22} isActive={false} />
      <Typography variant="small" style={styles.textInactive}>
        {days} {days === 1 ? 'dzień' : 'dni'}
      </Typography>
    </TouchableOpacity>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  containerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  containerInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Theme.backgroundAlt,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  fireWrapper: {
    width: 18,
    height: 18,
  },
  textActive: {
    color: Theme.textInverse,
    fontWeight: 'bold',
  },
  textInactive: {
    color: Theme.textMuted,
    fontWeight: '500',
  },
});
