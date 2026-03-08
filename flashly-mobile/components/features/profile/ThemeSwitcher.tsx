import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, Moon, Monitor } from 'lucide-react-native';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode } from '@/store/themeStore';
import { Spacing, Radius } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';

interface ThemeSwitcherProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const MODES: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { key: 'light', label: 'Jasny', Icon: Sun },
  { key: 'dark', label: 'Ciemny', Icon: Moon },
  { key: 'system', label: 'System', Icon: Monitor },
];

const PREVIEW_COLORS = {
  light: {
    bg: '#F6F7FB',
    card: '#FFFFFF',
    bar1: '#5B6CF0',
    bar2: '#E8ECFF',
    bar3: '#D1FAE5',
    accent: '#5B6CF0',
    textMuted: '#C0C0D0',
  },
  dark: {
    bg: '#0D0D1A',
    card: '#1A1A28',
    bar1: '#6B7AFF',
    bar2: '#252540',
    bar3: '#064E3B',
    accent: '#6B7AFF',
    textMuted: '#3A3A50',
  },
};

function ThemePreview({ mode, isActive }: { mode: ThemeMode; isActive: boolean }) {
  const colors = mode === 'dark' ? PREVIEW_COLORS.dark : PREVIEW_COLORS.light;
  const lightC = PREVIEW_COLORS.light;
  const darkC = PREVIEW_COLORS.dark;

  const scale = useSharedValue(isActive ? 1 : 0.96);
  const opacity = useSharedValue(isActive ? 1 : 0.6);

  useEffect(() => {
    scale.value = withTiming(isActive ? 1 : 0.96, { duration: 250 });
    opacity.value = withTiming(isActive ? 1 : 0.6, { duration: 250 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (mode === 'system') {
    return (
      <Animated.View style={[previewStyles.frame, animStyle]}>
        <View style={previewStyles.splitWrap}>
          {/* Light half */}
          <View style={[previewStyles.splitSide, { backgroundColor: '#FFFFFF', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]}>
            <View style={[previewStyles.pBar, { backgroundColor: '#E8ECFF', width: '50%' }]} />
            <View style={[previewStyles.pCard, { backgroundColor: '#F0F1F8' }]}>
              <View style={[previewStyles.pLine, { backgroundColor: lightC.bar1, width: '65%' }]} />
              <View style={[previewStyles.pLine, { backgroundColor: '#C7CDFF', width: '85%' }]} />
            </View>
            <View style={[previewStyles.pBtn, { backgroundColor: lightC.bar1 }]} />
          </View>
          {/* Divider */}
          <View style={{ width: 1, backgroundColor: '#88888840' }} />
          {/* Dark half */}
          <View style={[previewStyles.splitSide, { backgroundColor: '#0A0A16', borderTopRightRadius: 8, borderBottomRightRadius: 8 }]}>
            <View style={[previewStyles.pBar, { backgroundColor: '#252540', width: '50%' }]} />
            <View style={[previewStyles.pCard, { backgroundColor: '#151524' }]}>
              <View style={[previewStyles.pLine, { backgroundColor: darkC.bar1, width: '65%' }]} />
              <View style={[previewStyles.pLine, { backgroundColor: '#353560', width: '85%' }]} />
            </View>
            <View style={[previewStyles.pBtn, { backgroundColor: darkC.bar1 }]} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[previewStyles.frame, animStyle]}>
      <View style={[previewStyles.phone, { backgroundColor: colors.bg }]}>
        <View style={[previewStyles.pBar, { backgroundColor: colors.card, width: '45%' }]} />
        <View style={[previewStyles.pCard, { backgroundColor: colors.card }]}>
          <View style={[previewStyles.pLine, { backgroundColor: colors.bar1, width: '55%' }]} />
          <View style={[previewStyles.pLine, { backgroundColor: colors.bar2, width: '80%' }]} />
          <View style={[previewStyles.pLine, { backgroundColor: colors.bar3, width: '40%' }]} />
        </View>
        <View style={[previewStyles.pBtn, { backgroundColor: colors.bar1 }]} />
        <View style={previewStyles.pNav}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[previewStyles.pNavDot, { backgroundColor: i === 2 ? colors.accent : colors.textMuted }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const [itemWidth, setItemWidth] = useState(0);

  const indicatorX = useSharedValue(0);

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    const gap = Spacing.sm;
    const w = (totalWidth - gap * 2) / 3;
    setItemWidth(w);
    // Initialize indicator position
    const idx = MODES.findIndex(m => m.key === value);
    indicatorX.value = idx * (w + gap);
  }, [value]);

  useEffect(() => {
    if (itemWidth === 0) return;
    const idx = MODES.findIndex(m => m.key === value);
    const gap = Spacing.sm;
    indicatorX.value = withTiming(idx * (itemWidth + gap), { duration: 280 });
  }, [value, itemWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: itemWidth,
  }));

  const handleSelect = (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(mode);
  };

  return (
    <View style={[s.container, { backgroundColor: Theme.card, ...shadows.md }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.headerIcon, { backgroundColor: isDark ? Theme.primaryMuted : Theme.backgroundAlt }]}>
          {isDark ? <Moon size={18} color={Theme.primary} /> : <Sun size={18} color={Theme.warning} />}
        </View>
        <View>
          <Typography variant="bodySemi" color={Theme.text}>Wygląd</Typography>
          <Typography variant="caption" color={Theme.textMuted}>
            {value === 'light' ? 'Jasny motyw' : value === 'dark' ? 'Ciemny motyw' : 'Motyw systemowy'}
          </Typography>
        </View>
      </View>

      {/* Options */}
      <View style={s.optionsRow} onLayout={onRowLayout}>
        {/* Animated sliding indicator */}
        {itemWidth > 0 && (
          <Animated.View style={[s.indicator, indicatorStyle]}>
            <LinearGradient
              colors={[Theme.primary + '18', Theme.primary + '08']}
              style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
            />
            <View style={[s.indicatorBorder, { borderColor: Theme.primary + '50' }]} />
          </Animated.View>
        )}

        {MODES.map(({ key, label, Icon }) => {
          const isActive = value === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelect(key)}
              activeOpacity={0.8}
              style={s.option}
            >
              <ThemePreview mode={key} isActive={isActive} />
              <View style={s.optionLabel}>
                <Icon size={13} color={isActive ? Theme.primary : Theme.textMuted} strokeWidth={isActive ? 2.5 : 2} />
                <Typography
                  variant="caption"
                  color={isActive ? Theme.primary : Theme.textMuted}
                  style={{ fontWeight: isActive ? '700' : '500', fontSize: 12 }}
                >
                  {label}
                </Typography>
              </View>
              {isActive && <View style={[s.activeDot, { backgroundColor: Theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  frame: {
    height: 68,
    marginBottom: 6,
    alignSelf: 'stretch',
    marginHorizontal: 4,
  },
  phone: {
    flex: 1,
    borderRadius: 8,
    padding: 5,
    gap: 3,
    overflow: 'hidden',
  },
  splitWrap: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  splitSide: {
    flex: 1,
    padding: 4,
    gap: 3,
  },
  pBar: {
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  pCard: {
    borderRadius: 4,
    padding: 4,
    gap: 2.5,
    flex: 1,
  },
  pLine: {
    height: 2.5,
    borderRadius: 1.5,
  },
  pBtn: {
    height: 5,
    borderRadius: 2.5,
    width: '60%',
    alignSelf: 'center',
    marginTop: 1,
  },
  pNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 2,
  },
  pNavDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
});

const s = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: Radius.lg,
    zIndex: 0,
  },
  indicatorBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
  },
});
