import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'hero' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySemi' | 'small' | 'caption' | 'label';

interface TypographyProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
  style,
  variant = 'body',
  color,
  align = 'left',
  ...props
}: TypographyProps) {
  const { colors } = useTheme();

  const textStyles = [
    styles[variant],
    { color: color || colors.text, textAlign: align },
    style
  ];

  return <Text style={textStyles} {...props} />;
}

const styles = StyleSheet.create({
  hero: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h4: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySemi: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
});
