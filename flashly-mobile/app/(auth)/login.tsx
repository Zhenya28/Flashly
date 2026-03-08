import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/hooks/useTheme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, loginWithGoogle, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Wypełnij wszystkie pola');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError('');
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login(email, password);
    } catch (e) {
      setError('Nieprawidłowy email lub hasło');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loginWithGoogle();
    } catch (e) {
      setError('Nie udało się zalogować przez Google');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.header}>
              <View style={styles.logoContainer}>
                <Logo size={120} />
              </View>
              <Typography variant="h1" color={Theme.text} align="center">
                Witaj ponownie
              </Typography>
              <Typography variant="body" color={Theme.textSecondary} align="center">
                Zaloguj się do swojego konta
              </Typography>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
              <GlassCard padding="lg" style={styles.formCard}>
                {/* Email Field */}
                <View style={styles.fieldContainer}>
                  <Typography variant="small" color={Theme.textSecondary} style={styles.label}>
                    Email
                  </Typography>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'email' && styles.inputContainerFocused,
                    ]}
                  >
                    <Mail
                      size={20}
                      color={focusedField === 'email' ? Theme.primary : Theme.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="twoj@email.com"
                      placeholderTextColor={Theme.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.fieldContainer}>
                  <Typography variant="small" color={Theme.textSecondary} style={styles.label}>
                    Hasło
                  </Typography>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'password' && styles.inputContainerFocused,
                    ]}
                  >
                    <Lock
                      size={20}
                      color={focusedField === 'password' ? Theme.primary : Theme.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Twoje hasło"
                      placeholderTextColor={Theme.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setShowPassword(!showPassword);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={Theme.textSecondary} />
                      ) : (
                        <Eye size={20} color={Theme.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                    <Typography variant="small" color={Theme.destructive} align="center">
                      {error}
                    </Typography>
                  </Animated.View>
                ) : null}

                {/* Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={styles.primaryButton}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Theme.textInverse} />
                  ) : (
                    <>
                      <Typography variant="bodySemi" color={Theme.textInverse}>
                        Zaloguj się
                      </Typography>
                      <ArrowRight size={20} color={Theme.textInverse} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Typography variant="caption" color={Theme.textMuted} style={styles.dividerText}>
                    lub
                  </Typography>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Login */}
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  style={styles.googleButton}
                  activeOpacity={0.7}
                >
                  <AntDesign name="google" size={20} color={Theme.text} />
                  <Typography variant="bodySemi" color={Theme.text}>
                    Kontynuuj przez Google
                  </Typography>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.footer}>
              <Typography variant="body" color={Theme.textMuted}>
                Nie masz konta?{' '}
              </Typography>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <Typography variant="bodySemi" color={Theme.primary}>
                    Zarejestruj się
                  </Typography>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },

  // Form
  formCard: {
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Theme.input,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputContainerFocused: {
    borderColor: Theme.primary,
    backgroundColor: Theme.card,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Theme.text,
    height: '100%',
  },

  // Error
  errorContainer: {
    backgroundColor: Theme.destructiveLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: Spacing.sm,
    backgroundColor: Theme.primary,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: Spacing.sm,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Theme.border,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
