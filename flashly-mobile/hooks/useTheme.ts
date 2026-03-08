import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { Colors, getShadows } from '@/constants/Colors';

/**
 * Primary theme hook for all screens and components.
 * Returns resolved colors, shadow styles, and dark mode flag.
 */
export function useTheme() {
  const { mode } = useThemeStore();
  const systemScheme = useColorScheme();

  const isDark =
    mode === 'system'
      ? systemScheme === 'dark'
      : mode === 'dark';

  const colors = isDark ? Colors.dark : Colors.light;
  const shadows = getShadows(isDark);

  return { colors, isDark, shadows };
}
