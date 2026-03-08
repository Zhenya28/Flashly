import { View, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Typography } from './Typography';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon: Icon,
  style,
  containerStyle,
  ...props
}: InputProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Typography
          variant="small"
          color={Theme.textSecondary}
          style={styles.label}
        >
          {label}
        </Typography>
      )}

      <View
        style={[
          styles.container,
          error && styles.containerError,
        ]}
      >
        {Icon && (
          <View style={styles.iconContainer}>
            <Icon
              size={20}
              color={error ? Theme.destructive : Theme.textSecondary}
            />
          </View>
        )}

        <TextInput
          placeholderTextColor={Theme.textMuted}
          style={[
            styles.input,
            Icon && styles.inputWithIcon,
            style
          ]}
          {...props}
        />
      </View>

      {error && (
        <Typography
          variant="caption"
          color={Theme.destructive}
          style={styles.error}
        >
          {error}
        </Typography>
      )}
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Theme.input,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  containerError: {
    borderColor: Theme.destructive,
  },
  iconContainer: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Theme.text,
    paddingHorizontal: Spacing.md,
  },
  inputWithIcon: {
    paddingLeft: 52,
  },
  error: {
    marginLeft: Spacing.xs,
    marginTop: Spacing.xs,
  },
});
