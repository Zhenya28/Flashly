import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
} from "lucide-react-native";
import { AntDesign } from '@expo/vector-icons';
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/hooks/useTheme';

export default function RegisterScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { register, loginWithGoogle, isLoading } = useAuthStore();

  const progressWidth = useSharedValue(0);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordStrength = [hasMinLength, hasUpperCase, hasNumber].filter(
    Boolean,
  ).length;

  useEffect(() => {
    progressWidth.value = withSpring((passwordStrength / 3) * 100, {
      damping: 15,
      stiffness: 100,
    });
  }, [passwordStrength]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Wypełnij wszystkie pola");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await register(email, password, name);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('rate limit')) {
        setError("Za dużo prób. Odczekaj chwilę lub użyj innego maila.");
      } else if (e.message) {
        setError(e.message);
      } else {
        setError("Nie udało się utworzyć konta");
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loginWithGoogle();
    } catch (e) {
      setError('Nie udało się zarejestrować przez Google');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === 3) return Theme.success;
    if (passwordStrength === 2) return Theme.warning;
    return Theme.destructive;
  };

  const getStrengthText = () => {
    if (passwordStrength === 3) return "Silne hasło";
    if (passwordStrength === 2) return "Średnie hasło";
    if (passwordStrength === 1) return "Słabe hasło";
    return "";
  };

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex}>
        <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                 <ArrowLeft size={24} color={Theme.text} />
            </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                Dołącz do Flashly
              </Typography>
              <Typography variant="body" color={Theme.textSecondary} align="center">
                Stwórz konto i rozpocznij swoją przygodę
              </Typography>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.duration(400).delay(200)}>
              <GlassCard padding="lg" style={styles.formCard}>
                {/* Name Field */}
                <View style={styles.fieldContainer}>
                    <Typography variant="small" color={Theme.textSecondary} style={styles.label}>
                    Imię
                    </Typography>
                    <View
                    style={[
                        styles.inputContainer,
                        focusedField === "name" && styles.inputContainerFocused,
                    ]}
                    >
                    <User
                        size={20}
                        color={focusedField === "name" ? Theme.primary : Theme.textSecondary}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Jak mamy Cię nazywać?"
                        placeholderTextColor={Theme.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoComplete="name"
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                    />
                    </View>
                </View>

                {/* Email Field */}
                <View style={styles.fieldContainer}>
                    <Typography variant="small" color={Theme.textSecondary} style={styles.label}>
                    Email
                    </Typography>
                    <View
                    style={[
                        styles.inputContainer,
                        focusedField === "email" && styles.inputContainerFocused,
                    ]}
                    >
                    <Mail
                        size={20}
                        color={focusedField === "email" ? Theme.primary : Theme.textSecondary}
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
                        onFocus={() => setFocusedField("email")}
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
                        focusedField === "password" && styles.inputContainerFocused,
                    ]}
                    >
                    <Lock
                        size={20}
                        color={focusedField === "password" ? Theme.primary : Theme.textSecondary}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Minimum 8 znaków"
                        placeholderTextColor={Theme.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="password-new"
                        onFocus={() => setFocusedField("password")}
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

                    {/* Password Strength */}
                    {password.length > 0 && (
                      <Animated.View entering={FadeIn.duration(300)} style={styles.strengthContainer}>
                        {/* Progress Bar */}
                        <View style={styles.strengthBarBg}>
                          <Animated.View
                            style={[styles.strengthBarFill, { backgroundColor: getStrengthColor() }, progressStyle]}
                          />
                        </View>

                        <Typography variant="caption" style={{ color: getStrengthColor(), fontWeight: '600' }}>
                          {getStrengthText()}
                        </Typography>

                        {/* Requirements */}
                        <View style={styles.requirements}>
                          <View style={styles.requirementRow}>
                            <View
                              style={[
                                styles.checkCircle,
                                hasMinLength && { backgroundColor: Theme.success, borderColor: Theme.success },
                              ]}
                            >
                              {hasMinLength && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                            <Typography variant="caption" color={hasMinLength ? Theme.success : Theme.textMuted}>
                                8+ znaków
                            </Typography>
                          </View>

                          <View style={styles.requirementRow}>
                            <View
                              style={[
                                styles.checkCircle,
                                hasUpperCase && { backgroundColor: Theme.success, borderColor: Theme.success },
                              ]}
                            >
                              {hasUpperCase && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                            <Typography variant="caption" color={hasUpperCase ? Theme.success : Theme.textMuted}>
                                Wielka litera
                            </Typography>
                          </View>

                          <View style={styles.requirementRow}>
                            <View
                              style={[
                                styles.checkCircle,
                                hasNumber && { backgroundColor: Theme.success, borderColor: Theme.success },
                              ]}
                            >
                               {hasNumber && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                            <Typography variant="caption" color={hasNumber ? Theme.success : Theme.textMuted}>
                                Cyfra
                            </Typography>
                          </View>
                        </View>
                      </Animated.View>
                    )}
                </View>

                {/* Error Message */}
                {error ? (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                    <Typography variant="small" color={Theme.destructive} align="center">
                      {error}
                    </Typography>
                  </Animated.View>
                ) : null}

                {/* Register Button */}
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isLoading}
                  style={styles.primaryButton}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Theme.textInverse} />
                  ) : (
                    <>
                      <Typography variant="bodySemi" color={Theme.textInverse}>
                        Utwórz konto
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
            <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.footer}>
              <Typography variant="body" color={Theme.textMuted}>
                Masz już konto?{' '}
              </Typography>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <Typography variant="bodySemi" color={Theme.primary}>
                    Zaloguj się
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
  headerBar: {
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Theme.backgroundAlt,
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
    marginBottom: Spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
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

  // Password Strength
  strengthContainer: {
    marginTop: 12,
    gap: 10,
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: Theme.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  requirements: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.border,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.border,
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
