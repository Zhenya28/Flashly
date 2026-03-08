import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Dimensions, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { useStudyStore } from '@/store/studyStore';
import { Rating } from '@/lib/fsrs';
import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import {
  X,
  RotateCcw,
  Trophy,
  Target,
  Clock,
  Zap,
  AlertCircle,
  Sparkles,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import EmptyNote from '@/components/illustrations/EmptyNote';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { GoogleTTSService } from '@/services/tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = 380;

export default function StudyScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    queue,
    currentIndex,
    isLoading,
    isSessionComplete,
    isCollectionEmpty,
    error,
    collectionTitle,
    sessionStats,
    startSession,
    gradeCard,
    sourceLang,
    targetLang,
  } = useStudyStore();

  // Prevent multiple session starts
  const sessionInitiatedRef = useRef<string | null>(null);
  const hasFlippedRef = useRef(false);

  const flipProgress = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const buttonsOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Auto TTS state
  const [autoTTS, setAutoTTS] = useState(false);
  const ttsInitRef = useRef(false);
  const prevCardIdRef = useRef<string | null>(null);
  const hasSpokenFrontRef = useRef(false);

  const currentCard = queue[currentIndex];

  const progress = sessionStats.totalCards > 0
    ? (sessionStats.reviewed / sessionStats.totalCards) * 100
    : 0;

  useEffect(() => {
    if (id && sessionInitiatedRef.current !== id) {
      sessionInitiatedRef.current = id;
      startSession(id);
    }
  }, [id]);

  // Load TTS preference from storage
  useEffect(() => {
    AsyncStorage.getItem('@flashly_auto_tts').then((val) => {
      if (val === 'true') setAutoTTS(true);
      ttsInitRef.current = true;
    });
  }, []);

  // Auto-speak front when new card appears
  useEffect(() => {
    if (!autoTTS || !currentCard) return;
    const cardId = currentCard.flashcard.id;
    if (prevCardIdRef.current !== cardId) {
      prevCardIdRef.current = cardId;
      hasSpokenFrontRef.current = true;
      GoogleTTSService.speak(currentCard.flashcard.front, sourceLang).catch(() => {});
    }
  }, [currentCard?.flashcard.id, autoTTS, sourceLang]);

  useFocusEffect(
    useCallback(() => {
      const checkAndRedirect = async () => {
        try {
          // READ STATE DIRECTLY to avoid dependency loop with isCollectionEmpty toggling
          const currentEmpty = useStudyStore.getState().isCollectionEmpty;

          if (id && currentEmpty) {
            await startSession(id);

            // Check if we now have cards
            const { isCollectionEmpty: stillEmpty, queue } = useStudyStore.getState();
            if (!stillEmpty && queue.length > 0) {
              // User added cards! Redirect to Collection Details to start fresh
              router.replace(`/collections/${id}`);
            }
          }
        } catch (e) {
          console.error('checkAndRedirect failed:', e);
        }
      };

      checkAndRedirect();
    }, [id])
  );

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 500, easing: Easing.out(Easing.ease) });
  }, [progress]);

  const handleFlip = useCallback(() => {
    if (flipProgress.value === 0) {
      hasFlippedRef.current = true;
      flipProgress.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) });
      buttonsOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

      // Auto TTS: speak back (answer) in target language
      if (autoTTS && currentCard) {
        setTimeout(() => {
          GoogleTTSService.speak(currentCard.flashcard.back, targetLang).catch(() => {});
        }, 300);
      }
    }
  }, [autoTTS, currentCard, targetLang]);

  const handleGrade = useCallback((rating: Rating) => {
    // Haptic feedback based on rating
    if (rating === 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (rating === 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (rating === 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Run animations on UI thread
    cardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    buttonsOpacity.value = withTiming(0, { duration: 150 });
    flipProgress.value = withTiming(0, { duration: 300 });
    // Grade card on JS thread
    gradeCard(rating);
  }, [gradeCard]);

  const cardContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: cardScale.value }]
    };
  });

  const frontCardStyle = useAnimatedStyle(() => {
    'worklet';
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` }
      ],
      opacity: flipProgress.value < 0.5 ? 1 : 0,
      backfaceVisibility: 'hidden' as const
    };
  });

  const backCardStyle = useAnimatedStyle(() => {
    'worklet';
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` }
      ],
      opacity: flipProgress.value >= 0.5 ? 1 : 0,
      backfaceVisibility: 'hidden' as const
    };
  });

  const buttonsStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: buttonsOpacity.value,
      transform: [{ translateY: interpolate(buttonsOpacity.value, [0, 1], [20, 0]) }]
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progressWidth.value}%`
    };
  });

  // Loading State
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingScreen 
          title="Przygotowuję fiszki" 
          subtitle="Mieszam karty..." 
          mode="flashcards" 
        />
      </>
    );
  }

  // Error State
  if (error) {
    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centered}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={40} color={Theme.destructive} />
            </View>
            <Typography variant="h2" color={Theme.text} style={styles.errorTitle}>
              Wystąpił błąd
            </Typography>
            <Typography variant="body" color={Theme.textMuted} style={styles.errorText}>
              {error}
            </Typography>
            <View style={styles.errorButtons}>
              <TouchableOpacity onPress={() => router.back()} style={styles.errorButtonSecondary}>
                <Typography variant="bodySemi" color={Theme.textSecondary}>Wróć</Typography>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => id && startSession(id)} style={styles.errorButtonPrimary}>
                <Typography variant="bodySemi" color={Theme.primary}>Spróbuj ponownie</Typography>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </GradientBackground>
    );
  }



  // Empty Collection State
  if (isCollectionEmpty) {
    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex}>
            {/* Header */}
            <View style={styles.completeHeader}>
              <TouchableOpacity onPress={() => router.back()}>
                <X size={24} color={Theme.textMuted} />
              </TouchableOpacity>
              <Typography variant="caption" color={Theme.textMuted}>
                Pusta kolekcja
              </Typography>
              <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <View style={styles.completeContent}>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={{ alignItems: 'center', marginBottom: -20, marginTop: -20 }}>
                 <EmptyNote width={260} height={260} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300)}>
                <Typography variant="h2" color={Theme.text} align="center" style={{ marginBottom: 8, marginTop: 8 }}>
                   Brak fiszek w tej kolekcji
                </Typography>
                <Typography variant="body" color={Theme.textMuted} align="center" style={{ maxWidth: 300 }}>
                   Ta kolekcja jest pusta. Dodaj nowe fiszki, aby rozpocząć naukę!
                </Typography>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(400)} style={styles.completeButton}>
                 <TouchableOpacity 
                    onPress={() => {
                        // Navigate to create card page
                        if (id && id !== 'all' && id !== 'hard_mode') {
                            router.push({
                                pathname: '/cards/create',
                                params: { collectionId: id }
                            });
                        } else {
                            // If somehow here with 'all' or 'hard_mode', shouldn't happen usually if valid
                            router.back();
                        }
                    }} 
                    style={[styles.returnButton, { backgroundColor: Theme.primary, flexDirection: 'row', gap: 8, justifyContent: 'center', width: 300 }]}
                  >
                   <Plus size={20} color={Theme.textInverse} />
                   <Typography variant="bodySemi" color={Theme.textInverse}>
                     Dodaj nowe fiszki
                   </Typography>
                 </TouchableOpacity>

                 {/* AI Generation Button */}
                 <TouchableOpacity 
                    onPress={() => {
                        if (id && id !== 'all' && id !== 'hard_mode') {
                            router.push({
                                pathname: '/cards/generate',
                                params: { collectionId: id }
                            });
                        }
                    }}
                    style={[styles.returnButton, { backgroundColor: Theme.backgroundAlt, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: Theme.primaryMuted, width: 300 }]}
                  >
                   <Sparkles size={20} color={Theme.primary} />
                   <Typography variant="bodySemi" color={Theme.primary}>
                     Generuj z AI
                   </Typography>
                 </TouchableOpacity>


              </Animated.View>
            </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Session Complete
  if (isSessionComplete) {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    const duration = sessionStats.endTime && sessionStats.startTime
      ? Math.round((sessionStats.endTime.getTime() - sessionStats.startTime.getTime()) / 1000)
      : 0;

    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex}>
          {/* Header */}
          <View style={styles.completeHeader}>
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={Theme.textMuted} />
            </TouchableOpacity>
            <Typography variant="caption" color={Theme.textMuted}>
              Sesja zakończona
            </Typography>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <View style={styles.completeContent}>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.trophyContainer}>
              <View style={styles.trophyIcon}>
                <Trophy size={48} color={Theme.success} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300)}>
              <Typography variant="h1" color={Theme.text} align="center">
                {sessionStats.totalCards === 0 ? 'Wszystko zrobione!' : 'Świetna robota!'}
              </Typography>
              <Typography variant="body" color={Theme.textMuted} align="center" style={{ marginTop: 8 }}>
                {sessionStats.totalCards === 0
                  ? 'Nie masz kart do powtórki'
                  : `Przerobiono ${sessionStats.reviewed} kart`}
              </Typography>
            </Animated.View>

            {sessionStats.reviewed > 0 && (
              <Animated.View entering={FadeInDown.delay(400)} style={styles.statsCard}>
                <GlassCard padding="lg">
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: Theme.successLight }]}>
                        <Target size={24} color={Theme.success} />
                      </View>
                      <Typography variant="h2" color={Theme.success}>{accuracy}%</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Skuteczność</Typography>
                    </View>

                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: Theme.primaryMuted }]}>
                        <Zap size={24} color={Theme.primary} />
                      </View>
                      <Typography variant="h2" color={Theme.primary}>{sessionStats.reviewed}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Karty</Typography>
                    </View>

                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: Theme.infoLight }]}>
                        <Clock size={24} color={Theme.info} />
                      </View>
                      <Typography variant="h2" color={Theme.info}>{formatDuration(duration)}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Czas</Typography>
                    </View>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                      <Typography variant="bodySemi" color={Theme.success}>{sessionStats.easy}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Łatwo</Typography>
                    </View>
                    <View style={styles.breakdownItem}>
                      <Typography variant="bodySemi" color={Theme.info}>{sessionStats.good}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Dobrze</Typography>
                    </View>
                    <View style={styles.breakdownItem}>
                      <Typography variant="bodySemi" color={Theme.warning}>{sessionStats.hard}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Ciężko</Typography>
                    </View>
                    <View style={styles.breakdownItem}>
                      <Typography variant="bodySemi" color={Theme.destructive}>{sessionStats.again}</Typography>
                      <Typography variant="caption" color={Theme.textMuted}>Znowu</Typography>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(500)} style={styles.completeButton}>
              <TouchableOpacity onPress={() => router.back()} style={styles.returnButton}>
                <Typography variant="bodySemi" color={Theme.textInverse}>
                  Wróć do kolekcji
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!currentCard) return null;

  // Active Study
  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Zakończ sesję?',
                'Twój postęp z tej sesji zostanie zapisany.',
                [
                  { text: 'Kontynuuj', style: 'cancel' },
                  { text: 'Zakończ', style: 'destructive', onPress: () => router.back() },
                ]
              );
            }} style={styles.closeButton}>
              <X size={20} color={Theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Typography variant="bodySemi" color={Theme.text} numberOfLines={1} style={styles.collectionTitle}>
                {collectionTitle}
              </Typography>
            </View>

            <View style={styles.counterBadge}>
              <Typography variant="caption" color={Theme.primary} style={{ fontWeight: '700' }}>
                {currentIndex + 1} / {queue.length}
              </Typography>
            </View>

            <TouchableOpacity
              onPress={() => {
                const newVal = !autoTTS;
                setAutoTTS(newVal);
                AsyncStorage.setItem('@flashly_auto_tts', String(newVal));
                Haptics.selectionAsync();
              }}
              style={styles.ttsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {autoTTS ? (
                <Volume2 size={20} color={Theme.primary} />
              ) : (
                <VolumeX size={20} color={Theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressBarStyle]} />
          </View>
        </Animated.View>

        {/* Card Container */}
        <View style={styles.cardContainer}>
          <Animated.View style={cardContainerStyle}>
            <TouchableOpacity activeOpacity={0.98} onPress={handleFlip} style={styles.cardTouch}>
              {/* Front Card - Question */}
              <Animated.View style={[styles.card, frontCardStyle]}>
                <View style={styles.cardOuter}>
                  {/* Label */}
                  <View style={styles.cardLabel}>
                    <View style={styles.questionBadge}>
                      <Sparkles size={12} color={Theme.primary} />
                      <Typography variant="label" color={Theme.primary} style={styles.badgeText}>
                        PYTANIE
                      </Typography>
                    </View>
                  </View>

                  {/* Main content - the word */}
                  <View style={styles.cardContent}>
                    <Typography variant="h1" color={Theme.text} align="center" style={styles.cardText}>
                      {currentCard.flashcard.front}
                    </Typography>
                  </View>

                  {/* Hint - hide after first flip */}
                  {!hasFlippedRef.current && (
                    <View style={styles.cardHint}>
                      <View style={styles.hintPill}>
                        <RotateCcw size={12} color={Theme.textMuted} />
                        <Typography variant="caption" color={Theme.textMuted} style={styles.hintText}>
                          Dotknij aby obrócić
                        </Typography>
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* Back Card - Answer */}
              <Animated.View style={[styles.card, styles.cardBack, backCardStyle]}>
                <View style={[styles.cardOuter, styles.cardOuterAnswer]}>
                  {/* Label */}
                  <View style={styles.cardLabel}>
                    <View style={styles.answerBadge}>
                      <Target size={12} color={Theme.success} />
                      <Typography variant="label" color={Theme.success} style={styles.badgeText}>
                        ODPOWIEDŹ
                      </Typography>
                    </View>
                  </View>

                  {/* Main content - the answer */}
                  <View style={styles.cardContent}>
                    <Typography variant="h1" color={Theme.text} align="center" style={styles.cardText}>
                      {currentCard.flashcard.back}
                    </Typography>
                  </View>

                  {/* Empty footer for balance */}
                  <View style={styles.cardFooter} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Grade Buttons */}
        <Animated.View style={[styles.gradeContainer, buttonsStyle]}>
          <View style={styles.gradeRow}>
            <GradeButton
              label="Znowu"
              color={Theme.destructive}
              bgColor={Theme.destructiveLight}
              onPress={() => handleGrade(1)}
            />
            <GradeButton
              label="Ciężko"
              color={Theme.warning}
              bgColor={Theme.warningLight}
              onPress={() => handleGrade(2)}
            />
            <GradeButton
              label="Dobrze"
              color={Theme.info}
              bgColor={Theme.infoLight}
              onPress={() => handleGrade(3)}
            />
            <GradeButton
              label="Łatwo"
              color={Theme.success}
              bgColor={Theme.successLight}
              onPress={() => handleGrade(4)}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

interface GradeButtonProps {
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function GradeButton({ label, color, bgColor, onPress }: GradeButtonProps) {
    const { colors: Theme } = useTheme();
    const styles = getStyles(Theme);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  return (
    <Animated.View style={[styles.gradeButton, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[styles.gradeButtonInner, { backgroundColor: bgColor }]}
      >
        <Typography variant="bodySemi" style={{ color, fontWeight: '700', fontSize: 15 }}>
          {label}
        </Typography>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },

  // Loading
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.destructiveLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  errorButtonSecondary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.md,
  },
  errorButtonPrimary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Theme.primaryMuted,
    borderRadius: Radius.md,
  },

  // Complete
  completeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  completeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  trophyContainer: {
    marginBottom: Spacing.lg,
  },
  trophyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Theme.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  completeButton: {
    width: '100%',
    marginTop: Spacing.xl,
    alignItems: 'center', // Center buttons instead of stretch
  },
  returnButton: {
    backgroundColor: Theme.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg, // Match collections empty button
    borderRadius: Radius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    // Shadows like in collections
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
  },
  collectionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  counterBadge: {
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  ttsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  progressBar: {
    height: 4,
    backgroundColor: Theme.progressBg,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.primary,
    borderRadius: Radius.full,
  },

  // Card
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  cardTouch: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardBack: {
    // Positioned on top but hidden by animation
  },
  cardOuter: {
    flex: 1,
    borderRadius: Radius.xxl,
    backgroundColor: Theme.card,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  cardOuterAnswer: {
    backgroundColor: Theme.successLight,
    borderColor: Theme.success + '30',
  },
  cardLabel: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  cardText: {
    fontSize: 36,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cardHint: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  hintText: {
    fontSize: 11,
  },
  cardFooter: {
    height: 32,
  },

  // Grade Buttons
  gradeContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gradeButton: {
    flex: 1,
  },
  gradeButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
