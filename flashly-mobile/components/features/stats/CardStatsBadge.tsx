import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Typography } from '@/components/ui/Typography';
import { getMasteryColor } from '@/lib/mastery';
import { useTheme } from '@/hooks/useTheme';
import type { CardState } from '@/lib/fsrs';

interface CardStatsBadgeProps {
  mastery: number;    // 0-100
  state: CardState;
  size?: number;
}

export function CardStatsBadge({ mastery, state, size = 36 }: CardStatsBadgeProps) {
  const { colors: Theme } = useTheme();
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const isNew = state === 'new' || mastery === 0;
  const color = getMasteryColor(mastery, Theme);
  const strokeDashoffset = circumference - (circumference * mastery) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Theme.progressBg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        {!isNew && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </Svg>
      {/* Center label */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Typography
          variant="caption"
          color={isNew ? Theme.textMuted : color}
          style={[styles.label, { fontSize: size * 0.3 }]}
        >
          {isNew ? 'N' : `${mastery}`}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
