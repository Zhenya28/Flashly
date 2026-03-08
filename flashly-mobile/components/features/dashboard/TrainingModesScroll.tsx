import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Target, Zap, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface TrainingModesScrollProps {
  onModePress: (mode: 'quick_quiz' | 'hard_mode' | 'new_only') => void;
}

export const TrainingModesScroll = ({ onModePress }: TrainingModesScrollProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const modes = [
    {
      id: 'quick_quiz',
      title: 'Szybki Quiz',
      subtitle: '10 losowych pytań',
      icon: Target,
      color: Theme.success,
      bgColor: Theme.successLight, // fallback if not defined in colors
    },
    {
      id: 'hard_mode',
      title: 'Trudne Słówka',
      subtitle: 'Tylko te z błędami',
      icon: TrendingUp, // representing hard slope
      color: Theme.destructive,
      bgColor: Theme.destructiveLight,
    },
    // Add more if needed
  ];

  return (
    <View style={styles.container}>
      <Typography variant="h3" color={Theme.text} style={styles.title}>
        Trening Specjalny
      </Typography>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {modes.map((mode) => (
          <TouchableOpacity 
            key={mode.id}
            activeOpacity={0.7}
            style={styles.card}
            onPress={() => onModePress(mode.id as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: mode.bgColor || mode.color + '20' }]}>
              <mode.icon size={24} color={mode.color} />
            </View>
            <View style={styles.textContainer}>
              <Typography variant="bodySemi" color={Theme.text}>{mode.title}</Typography>
              <Typography variant="caption" color={Theme.textMuted}>{mode.subtitle}</Typography>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    width: 160,
    padding: Spacing.md,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: 2,
  }
});
