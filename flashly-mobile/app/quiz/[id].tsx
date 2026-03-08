import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuizStore } from '@/store/quizStore';
import { Typography } from '@/components/ui/Typography';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { LoadingScreen as ReusableLoadingScreen } from '@/components/ui/LoadingScreen';
import {
  X,
  Check,
  XCircle,
  Trophy,
  Clock,
  ArrowRight,
  RotateCcw,
  Target,
  Flame,
  Star,
  Plus,
  Zap,
  Sparkles,
} from 'lucide-react-native';
import { useStudyStore } from '@/store/studyStore';
import EmptyNote from '@/components/illustrations/EmptyNote';
import { useFocusEffect } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const { width, height } = Dimensions.get('window');

// Replaced inline loading components with imported LoadingScreen


export default function QuizScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    questions,
    currentIndex,
    isLoading,
    isSessionComplete,
    isCollectionEmpty,
    error,
    stats,
    selectedAnswer,
    isAnswerRevealed,
    isCorrect,
    startQuiz,
    selectAnswer,
    revealAnswer,
    nextQuestion,
    resetQuiz,
    getProgress,
    getTimeElapsed,
  } = useQuizStore();

  const sessionInitiatedRef = useRef<string | null>(null);
  const progressWidth = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentQuestion = questions[currentIndex];

  // Timer for live elapsed time
  useEffect(() => {
    if (!isSessionComplete && !isLoading && questions.length > 0) {
      const interval = setInterval(() => {
        setElapsedTime(getTimeElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSessionComplete, isLoading, questions.length, getTimeElapsed]);

  useEffect(() => {
    if (id && sessionInitiatedRef.current !== id) {
      sessionInitiatedRef.current = id;
      startQuiz(id);
    }
  }, [id]);

  useEffect(() => {
    const progress = getProgress();
    progressWidth.value = withTiming(progress, { duration: 400 });
  }, [currentIndex, questions.length]);
  
  // Re-check for content on focus (in case user added cards)
  useFocusEffect(
    React.useCallback(() => {
      const checkAndRedirect = async () => {
        try {
          // Check "is collection empty" from study store as general truth
          const studyStoreEmpty = useStudyStore.getState().isCollectionEmpty;

          if (id && studyStoreEmpty) {
            // Restart quiz to see if we now have cards
            await startQuiz(id);

            const { questions } = useQuizStore.getState();
            if (questions.length > 0) {
              // We have questions now — stay here with loaded questions
            }
          }
        } catch (e) {
          console.error('checkAndRedirect failed:', e);
        }
      };

      checkAndRedirect();
    }, [id])
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleOptionPress = async (index: number) => {
    if (isAnswerRevealed) return;
    await Haptics.selectionAsync();
    selectAnswer(index);
  };

  const handleConfirm = async () => {
    if (selectedAnswer === null) return;
    
    // Animate button
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1)
    );
    
    if (!isAnswerRevealed) {
      revealAnswer();
      // Haptic feedback based on answer
      const question = questions[currentIndex];
      const wasCorrect = selectedAnswer === question.correctIndex;
      if (wasCorrect) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      await Haptics.selectionAsync();
      nextQuestion();
    }
  };

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReusableLoadingScreen title="Przygotowuję quiz" subtitle="Wybieram pytania..." mode="quiz" />
      </>
    );
  }

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
                        if (id && id !== 'all') {
                            router.push({
                                pathname: '/cards/create',
                                params: { collectionId: id }
                            });
                        } else {
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
                        if (id && id !== 'all') {
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

  // Generic Error State
  if (error) {
    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centered}>
            <View style={styles.errorIcon}>
              <XCircle size={40} color={Theme.destructive} />
            </View>
            <Typography variant="h3" color={Theme.text} style={{ marginTop: 16, marginBottom: 8 }}>
              Wystąpił błąd
            </Typography>
            <Typography variant="body" color={Theme.textMuted} align="center" style={{ marginBottom: 24 }}>
              {error}
            </Typography>
             <TouchableOpacity 
              style={{ padding: 10 }} 
              onPress={() => router.back()}
            >
               <Typography variant="bodySemi" color={Theme.primary}>
                 Wróć
               </Typography>
            </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Results screen
  if (isSessionComplete) {
    const percentage = stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
    const isGreat = percentage >= 80;
    const isGood = percentage >= 60;
    const trophyColor = isGreat ? Theme.warning : isGood ? Theme.textMuted : Theme.warningDark;

    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex}>
          <View style={styles.resultsContainer}>
            {/* Trophy */}
            <Animated.View entering={ZoomIn.delay(100).duration(500)}>
              <View style={[styles.trophyContainer, { borderColor: trophyColor + '40' }]}>
                <Trophy size={56} color={trophyColor} fill={trophyColor} />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Typography variant="h1" color={Theme.text} style={styles.resultTitle}>
                {isGreat ? '🎉 Świetnie!' : isGood ? '👍 Nieźle!' : '💪 Ćwicz dalej!'}
              </Typography>
            </Animated.View>

            {/* Score */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <View style={styles.scoreContainer}>
                <Typography variant="hero" color={Theme.primary} style={styles.percentageText}>
                  {percentage}%
                </Typography>
                <View style={styles.scoreDivider} />
                <Typography variant="body" color={Theme.textSecondary}>
                  {stats.correctAnswers} z {stats.totalQuestions} poprawnych
                </Typography>
              </View>
            </Animated.View>

            {/* Stats Cards */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: Theme.primaryMuted }]}>
                  <Clock size={18} color={Theme.primary} />
                </View>
                <Typography variant="bodySemi" color={Theme.text}>
                  {formatTime(stats.timeElapsed)}
                </Typography>
                <Typography variant="caption" color={Theme.textMuted}>
                  Czas
                </Typography>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: Theme.successLight }]}>
                  <Check size={18} color={Theme.success} />
                </View>
                <Typography variant="bodySemi" color={Theme.text}>
                  {stats.correctAnswers}
                </Typography>
                <Typography variant="caption" color={Theme.textMuted}>
                  Dobrze
                </Typography>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: Theme.destructiveLight }]}>
                  <X size={18} color={Theme.error} />
                </View>
                <Typography variant="bodySemi" color={Theme.text}>
                  {stats.wrongAnswers}
                </Typography>
                <Typography variant="caption" color={Theme.textMuted}>
                  Źle
                </Typography>
              </View>

              {stats.bestStreak >= 2 && (
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: Theme.warningLight }]}>
                    <Flame size={18} color={Theme.streakGradientStart} fill={Theme.streakGradientStart} />
                  </View>
                  <Typography variant="bodySemi" color={Theme.text}>
                    {stats.bestStreak}
                  </Typography>
                  <Typography variant="caption" color={Theme.textMuted}>
                    Seria
                  </Typography>
                </View>
              )}
            </Animated.View>

            {/* Buttons */}
            <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.resultButtons}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  resetQuiz();
                  if (id) startQuiz(id);
                }}
                activeOpacity={0.7}
              >
                <RotateCcw size={18} color={Theme.primary} />
                <Typography variant="bodySemi" color={Theme.primary}>
                  Spróbuj ponownie
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity style={styles.finishButton} onPress={() => router.back()} activeOpacity={0.8}>
                <Typography variant="bodySemi" color="#FFFFFF">
                  Zakończ
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Quiz question screen
  if (!currentQuestion) {
    return null;
  }

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} activeOpacity={0.7}>
            <X size={18} color={Theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Typography variant="bodySemi" color={Theme.text}>
              {currentIndex + 1} / {questions.length}
            </Typography>
            {/* Streak badge */}
            {stats.currentStreak >= 2 && (
              <Animated.View entering={ZoomIn.duration(300)} style={styles.streakBadge}>
                <Flame size={12} color="#FF6B35" fill="#FF6B35" />
                <Typography variant="caption" color="#FF6B35" style={{ fontWeight: '700' }}>
                  {stats.currentStreak}
                </Typography>
              </Animated.View>
            )}
          </View>

          <View style={styles.timerBadge}>
            <Clock size={12} color={Theme.textMuted} />
            <Typography variant="caption" color={Theme.textMuted}>
              {formatTime(elapsedTime)}
            </Typography>
          </View>
        </View>

        {/* Progress bar - bigger and more visible */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {questions.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < currentIndex && styles.progressDotComplete,
                  i === currentIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Main content area */}
        <View style={styles.contentArea}>
          {/* Question Card */}
          <Animated.View entering={FadeIn.duration(400)} key={currentQuestion.id} style={styles.questionCard}>
            <View style={styles.questionBadge}>
              <Target size={14} color={Theme.primary} />
              <Typography variant="caption" color={Theme.primary}>
                Przetłumacz
              </Typography>
            </View>
            <Typography variant="h2" color={Theme.text} style={styles.questionText}>
              "{currentQuestion.question.replace('Jak przetłumaczyć "', '').replace('"?', '')}"
            </Typography>
          </Animated.View>

          {/* Answer label */}
          <View style={styles.answerLabel}>
            <Typography variant="caption" color={Theme.textMuted}>
              Wybierz poprawną odpowiedź
            </Typography>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === currentQuestion.correctIndex;
            const showCorrect = isAnswerRevealed && isCorrectOption;
            const showWrong = isAnswerRevealed && isSelected && !isCorrectOption;

            return (
              <Animated.View
                key={`${currentQuestion.id}-${index}`}
                entering={FadeInDown.delay(index * 80).duration(300)}
              >
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    isSelected && !isAnswerRevealed && styles.optionSelected,
                    showCorrect && styles.optionCorrect,
                    showWrong && styles.optionWrong,
                  ]}
                  onPress={() => handleOptionPress(index)}
                  disabled={isAnswerRevealed}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.optionIndicator,
                    isSelected && !isAnswerRevealed && styles.optionIndicatorSelected,
                    showCorrect && styles.optionIndicatorCorrect,
                    showWrong && styles.optionIndicatorWrong,
                  ]}>
                    {showCorrect && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    {showWrong && <X size={14} color="#FFFFFF" strokeWidth={3} />}
                    {!isAnswerRevealed && isSelected && <View style={styles.optionIndicatorDot} />}
                  </View>
                  <Typography
                    variant="body"
                    color={
                      showCorrect ? Theme.success
                        : showWrong ? Theme.error
                        : isSelected ? Theme.primary
                        : Theme.text
                    }
                    style={styles.optionText}
                  >
                    {option}
                  </Typography>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          </View>
        </View>

        {/* Confirm button */}
        <View style={styles.bottomContainer}>
          <Animated.View style={buttonAnimStyle}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedAnswer === null && styles.confirmButtonDisabled,
                isAnswerRevealed && isCorrect && styles.confirmButtonSuccess,
                isAnswerRevealed && !isCorrect && styles.confirmButtonError,
              ]}
              onPress={handleConfirm}
              disabled={selectedAnswer === null}
              activeOpacity={0.8}
            >
              <Typography variant="bodySemi" color="#FFFFFF">
                {isAnswerRevealed ? (isCorrect ? 'Świetnie! Dalej' : 'Dalej') : 'Sprawdź odpowiedź'}
              </Typography>
              {isAnswerRevealed && <ArrowRight size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </GradientBackground>
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
  contentArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },

  // Loading screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  loadingSubtitle: {
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.primary,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.destructiveLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.backgroundAlt,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Theme.warningLight,
    marginTop: 4,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressBg: {
    height: 8,
    backgroundColor: Theme.backgroundAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.success,
    borderRadius: 4,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.border,
  },
  progressDotComplete: {
    backgroundColor: Theme.success,
  },
  progressDotCurrent: {
    backgroundColor: Theme.primary,
    width: 24,
  },

  // Question
  questionCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Theme.primaryMuted,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  questionText: {
    textAlign: 'center',
    lineHeight: 34,
  },

  // Answer label
  answerLabel: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Options
  optionsContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  optionButton: {
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingLeft: Spacing.md,
    borderWidth: 2,
    borderColor: Theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionSelected: {
    borderColor: Theme.primary,
    backgroundColor: Theme.primaryMuted,
  },
  optionCorrect: {
    borderColor: Theme.success,
    backgroundColor: Theme.successLight,
  },
  optionWrong: {
    borderColor: Theme.error,
    backgroundColor: Theme.destructiveLight,
  },
  optionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Theme.border,
    backgroundColor: Theme.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndicatorSelected: {
    borderColor: Theme.primary,
    backgroundColor: Theme.primary,
  },
  optionIndicatorCorrect: {
    borderColor: Theme.success,
    backgroundColor: Theme.success,
  },
  optionIndicatorWrong: {
    borderColor: Theme.error,
    backgroundColor: Theme.error,
  },
  optionIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.card,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },

  // Bottom
  bottomContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  confirmButton: {
    backgroundColor: Theme.primary,
    height: 56,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  confirmButtonSuccess: {
    backgroundColor: Theme.success,
    shadowColor: Theme.success,
  },
  confirmButtonError: {
    backgroundColor: Theme.primary,
  },
  errorButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },

  // Results
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  trophyContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  percentageText: {
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80,
  },
  scoreDivider: {
    width: 40,
    height: 3,
    backgroundColor: Theme.border,
    borderRadius: 2,
    marginVertical: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultButtons: {
    width: '100%',
    gap: Spacing.sm,
  },
  retryButton: {
    height: 52,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Theme.primary,
    backgroundColor: Theme.card,
  },
  finishButton: {
    backgroundColor: Theme.primary,
    height: 52,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  // Empty State Styles

  completeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  completeButton: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  returnButton: {
    height: 52,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
