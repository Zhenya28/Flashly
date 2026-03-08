import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from './Typography';
import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const isDisabled = loading || disabled;

  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    isDisabled && styles.disabled,
    style
  ];

  const textColor = {
    primary: Theme.textInverse,
    secondary: Theme.text,
    outline: Theme.primary,
    ghost: Theme.text,
  }[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      style={buttonStyles}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Theme.textInverse : Theme.primary}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Typography
            variant="bodySemi"
            color={isDisabled ? Theme.textDisabled : textColor}
          >
            {children}
          </Typography>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },

  // Variants
  primary: {
    backgroundColor: Theme.primary,
  },
  secondary: {
    backgroundColor: Theme.backgroundAlt,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Theme.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: {
    height: 40,
    paddingHorizontal: Spacing.md,
  },
  size_md: {
    height: 48,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: Spacing.xl,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
});
