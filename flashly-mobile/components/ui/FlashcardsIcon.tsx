import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

interface FlashcardsIconProps {
  size?: number;
  color?: string;
  fill?: string;
}

export const FlashcardsIcon = ({ size = 24, color, fill = 'none' }: FlashcardsIconProps) => {
  const { colors: Theme } = useTheme();
  const strokeColor = color || Theme.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 6L3 5L2 17L7 18" />
      <Path d="M17 6L21 5L22 17L17 18" />
      <Rect x="7" y="4" width="10" height="15" rx="1.5" fill={fill} />
    </Svg>
  );
};
