import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { TimeFilter } from '@/services/profile';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface TimeFilterTabsProps {
  value: TimeFilter;
  onChange: (filter: TimeFilter) => void;
}

const FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'week', label: 'Tydzień' },
  { value: 'month', label: 'Miesiąc' },
  { value: 'year', label: 'Rok' }
];

export function TimeFilterTabs({ value, onChange }: TimeFilterTabsProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const isActive = value === filter.value;

        return (
          <TouchableOpacity
            key={filter.value}
            onPress={() => onChange(filter.value)}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Typography
              variant="small"
              color={isActive ? Theme.primary : Theme.textMuted}
              style={isActive && styles.textActive}
            >
              {filter.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textActive: {
    fontWeight: '600',
  },
});
