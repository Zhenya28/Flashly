import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore } from '@/store/collectionStore';
import { useStudyStore } from '@/store/studyStore';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  X,
  Sparkles,
  Wand2,
  ChevronLeft,
  Zap,
  Stars,
  Play,
  Check
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { GeminiService } from '@/services/gemini';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CardCount = 10 | 25 | 50 | 100;
const CARD_COUNT_OPTIONS: CardCount[] = [10, 25, 50, 100];

// Subtle sparkle animation for AI section
const FloatingSparkle = ({
  delay,
  size,
  left,
  top,
}: {
  delay: number;
  size: number;
  left: number;
  top: number;
}) => {
  const { colors: Theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top }, animatedStyle]}>
      <Sparkles size={size} color={Theme.primary} />
    </Animated.View>
  );
};

export default function GenerateCardsScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { collections, addCardsBatch, fetchCollections } = useCollectionStore();
  
  // Find collection to get languages
  // If not found (e.g. reload), might need to fetch
  const collection = collections.find(c => c.id === collectionId);

  useEffect(() => {
    if (!collection && collectionId) {
        fetchCollections();
    }
  }, [collectionId, collection]);

  // AI State
  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState<CardCount>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<{ front: string; back: string }[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!topic || !collection) return;
    try {
      setIsGenerating(true);
      
      const cards = await GeminiService.generateCards(
          topic, 
          collection.source_lang, 
          collection.target_lang, 
          cardCount
      );
      setGeneratedCards(cards);
      setStep('preview');
    } catch (e: any) {
      Alert.alert('Błąd AI', e.message || 'Nie udało się wygenerować kart.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedCards.length || !collectionId) return;
    try {
      setIsSubmitting(true);
      await addCardsBatch(collectionId, generatedCards);
      
      // Force reset study session so it picks up new cards
      useStudyStore.getState().resetSession();

      // Redirect back to the collection details to show the new cards
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/collections/${collectionId}`);
      }
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać fiszek.');
      setIsSubmitting(false);
    }
  };

  if (!collection) {
      return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Theme.primary} />
          </View>
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 20,
        }}
      >
        <Typography variant="h2" color={Theme.text}>
          Generuj Fiszki AI
        </Typography>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: Radius.full,
            backgroundColor: Theme.backgroundAlt,
          }}
        >
          <X size={20} color={Theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
              {/* AI Mode */}
              {step === 'input' ? (
                <View style={{ gap: 24 }}>
                  {/* AI Magic Hero Section */}
                  <View
                    style={{
                      borderRadius: Radius.xxl,
                      overflow: 'hidden',
                      shadowColor: Theme.primary,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 24,
                    }}
                  >
                    <LinearGradient
                      colors={[Theme.gradientMid, Theme.gradientStart, Theme.primarySoft]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 24,
                        position: 'relative',
                      }}
                    >
                      {/* Subtle Floating Sparkles */}
                      <FloatingSparkle delay={0} size={12} left={20} top={15} />
                      <FloatingSparkle delay={500} size={10} left={SCREEN_WIDTH - 100} top={25} />
                      <FloatingSparkle delay={1000} size={14} left={SCREEN_WIDTH - 140} top={80} />

                      {/* AI Badge */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        <LinearGradient
                          colors={[Theme.primaryLight, Theme.primary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: Radius.full,
                          }}
                        >
                          <Stars size={14} color="#FFFFFF" />
                          <Typography
                            variant="label"
                            color="#FFFFFF"
                            style={{ letterSpacing: 1 }}
                          >
                            GEMINI AI
                          </Typography>
                        </LinearGradient>
                        
                        <Typography variant="caption" color={Theme.textSecondary}>
                             {collection.source_lang} → {collection.target_lang}
                        </Typography>
                      </View>

                      {/* Topic Input */}
                      <View
                        style={{
                          backgroundColor: Theme.card,
                          borderRadius: Radius.xl,
                          borderWidth: 2,
                          borderColor: Theme.primaryLight,
                        }}
                      >
                        <TextInput
                          placeholder="np. Owoce, Podróże, Biznes..."
                          value={topic}
                          onChangeText={setTopic}
                          style={{
                            color: Theme.text,
                            padding: 20,
                            fontSize: 18,
                            fontWeight: '500',
                          }}
                          placeholderTextColor={Theme.primary}
                        />
                      </View>

                      {/* Card Count Selector */}
                      <View style={{ marginTop: 20 }}>
                        <Typography
                          variant="label"
                          color={Theme.textSecondary}
                          style={{ marginBottom: 10, marginLeft: 4 }}
                        >
                          ILOŚĆ FISZEK
                        </Typography>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {CARD_COUNT_OPTIONS.map((count) => (
                            <TouchableOpacity
                              key={count}
                              onPress={() => setCardCount(count)}
                              activeOpacity={0.7}
                              style={{
                                flex: 1,
                                height: 44,
                                borderRadius: Radius.lg,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor:
                                  cardCount === count ? Theme.primary : Theme.card,
                                borderWidth: cardCount === count ? 0 : 1,
                                borderColor: Theme.primaryLight,
                              }}
                            >
                              <Typography
                                variant="bodySemi"
                                color={cardCount === count ? Theme.textInverse : Theme.primary}
                                style={{ fontSize: 15 }}
                              >
                                {count}
                              </Typography>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* AI Info */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 12,
                          marginTop: 20,
                          paddingHorizontal: 4,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: 'rgba(140, 169, 255, 0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Zap size={16} color={Theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Typography
                            variant="small"
                            color={Theme.text}
                            style={{ fontWeight: '600', marginBottom: 4 }}
                          >
                            Inteligentne generowanie
                          </Typography>
                          <Typography
                            variant="caption"
                            color={Theme.textSecondary}
                            style={{ lineHeight: 18 }}
                          >
                            AI stworzy {cardCount} unikalnych fiszek na wybrany temat dla tej kolekcji.
                          </Typography>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity
                    onPress={handleGenerate}
                    disabled={isGenerating || !topic}
                    activeOpacity={0.85}
                    style={{
                      opacity: !topic || isGenerating ? 0.6 : 1,
                      shadowColor: Theme.primary,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                    }}
                  >
                    <LinearGradient
                      colors={
                        isGenerating
                          ? [Theme.primary, Theme.primary]
                          : [Theme.primaryLight, Theme.primary, Theme.primaryDark]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        height: 60,
                        borderRadius: Radius.xl,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <ActivityIndicator color="#FFFFFF" />
                          <Typography
                            variant="bodySemi"
                            color="#FFFFFF"
                            style={{ fontSize: 17 }}
                          >
                            AI tworzy fiszki...
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Wand2 size={22} color="#FFFFFF" />
                          <Typography
                            variant="bodySemi"
                            color="#FFFFFF"
                            style={{ fontSize: 17 }}
                          >
                            Wygeneruj {cardCount} Fiszek
                          </Typography>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 20 }}>
                  {/* Preview Header */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Typography variant="h3" color={Theme.text}>
                        Podgląd
                      </Typography>
                      <View
                        style={{
                          backgroundColor: Theme.primaryMuted,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: Radius.full,
                        }}
                      >
                        <Typography variant="label" color={Theme.primary}>
                          {generatedCards.length} FISZEK
                        </Typography>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setStep('input')}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                    >
                      <ChevronLeft size={18} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>
                        Wstecz
                      </Typography>
                    </TouchableOpacity>
                  </View>

                  {/* Generated Cards Preview */}
                  <View style={{ gap: 12 }}>
                    {generatedCards.map((card, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: Theme.card,
                          borderRadius: Radius.lg,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: Theme.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                             <Typography variant="caption" color={Theme.textSecondary} style={{ fontWeight: '600' }}>
                                 {index + 1}
                             </Typography>
                             <Check size={16} color={Theme.success} />
                        </View>
                        <View style={{ gap: 8 }}>
                          <Typography variant="bodySemi" color={Theme.text}>
                            {card.front}
                          </Typography>
                          <View style={{ height: 1, backgroundColor: Theme.borderLight }} />
                          <Typography variant="body" color={Theme.textSecondary}>
                            {card.back}
                          </Typography>
                        </View>
                      </View>
                    ))}
                  </View>
                  
                  {/* Action Buttons */}
                   <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: Theme.primary,
                      height: 56,
                      borderRadius: Radius.xl,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: 10,
                      shadowColor: Theme.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                    }}
                   >
                     {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                     ) : (
                         <>
                            <Check size={20} color="#FFFFFF" />
                            <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                                Dodaj {generatedCards.length} fiszek
                            </Typography>
                         </>
                     )}
                   </TouchableOpacity>

                </View>
              )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
