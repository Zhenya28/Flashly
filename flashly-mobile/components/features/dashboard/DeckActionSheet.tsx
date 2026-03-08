import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Typography } from '@/components/ui/Typography';
import { Spacing, Radius } from '@/constants/Colors';
import { FlashcardsIcon } from '@/components/ui/FlashcardsIcon';
import { Target, X, ChevronRight, Brain } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface DeckActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  deck: {
    id: string;
    title: string;
    stats?: {
      due: number;
      total: number;
      learned: number;
    };
  } | null;
}

export const DeckActionSheet = ({ isVisible, onClose, deck }: DeckActionSheetProps) => {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const router = useRouter();
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Smooth slide up without bounce
      translateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(300, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isVisible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!deck) return null;

  const handleStartFlashcards = () => {
    onClose();
    router.push(`/study/${deck.id}`);
  };

  const handleStartQuiz = () => {
    onClose();
    router.push(`/quiz/${deck.id}`);
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.sheetContent}>
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.deckIcon}>
                  <Brain size={24} color={Theme.primary} />
                </View>
                <View style={styles.headerText}>
                  <Typography variant="body" color={Theme.textMuted}>Wybrana talia</Typography>
                  <Typography variant="h3" color={Theme.text}>{deck.title}</Typography>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Zamknij" accessibilityRole="button">
                  <X size={20} color={Theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Typography variant="bodySemi" color={Theme.textSecondary} style={styles.sectionTitle}>
                Wybierz tryb nauki
              </Typography>

              <View style={styles.optionsContainer}>
                {/* Option 1: Flashcards */}
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.optionCard}
                  onPress={handleStartFlashcards}
                >
                  <View style={[styles.optionIcon, { backgroundColor: Theme.primaryMuted }]}>
                    <FlashcardsIcon size={24} color={Theme.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Typography variant="bodySemi" color={Theme.text}>Fiszki</Typography>
                    <Typography variant="caption" color={Theme.textMuted}>
                      Inteligentne powtórki
                    </Typography>
                  </View>
                  <ChevronRight size={20} color={Theme.primary} />
                </TouchableOpacity>

                {/* Option 2: Quiz */}
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.optionCard}
                  onPress={handleStartQuiz}
                >
                  <View style={[styles.optionIcon, { backgroundColor: Theme.successLight }]}>
                    <Target size={24} color={Theme.success} />
                  </View>
                  <View style={styles.optionText}>
                    <Typography variant="bodySemi" color={Theme.text}>Quiz</Typography>
                    <Typography variant="caption" color={Theme.textMuted}>
                      Szybki test wyboru
                    </Typography>
                  </View>
                  <ChevronRight size={20} color={Theme.success} />
                </TouchableOpacity>
              </View>

              <View style={styles.footerSpacing} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: Theme.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  sheetContent: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  deckIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.border,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: Spacing.md,
    ...shadows.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  footerSpacing: {
    height: 20,
  }
});
