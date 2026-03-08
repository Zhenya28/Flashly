import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { StreakWidget } from './StreakWidget';
import { Colors, Spacing } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface GreetingHeaderProps {
  name: string;
  streakDays: number;
}

export function GreetingHeader({ name, streakDays }: GreetingHeaderProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Witaj';
    return 'Dobry wieczór';
  };

  return (
    <View style={styles.container}>
      <View>
        <Typography variant="body" color={Theme.textMuted}>
          {getGreeting()},
        </Typography>
        <Typography variant="h1" color={Theme.text}>
          {name}
        </Typography>
      </View>
      <StreakWidget days={streakDays} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
});
