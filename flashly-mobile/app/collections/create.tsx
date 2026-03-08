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
  Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { Typography } from '@/components/ui/Typography';
import { LanguagePicker, getLanguageByCode } from '@/components/ui/LanguagePicker';
import { useCollectionStore } from '@/store/collectionStore';
import { router, Stack } from 'expo-router';
import {
  X,
  Sparkles,
  Wand2,
  Check,
  ChevronLeft,
  PenLine,
  Zap,
  Stars,
  ArrowLeftRight,
  Plus,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  FileText,
  Trash2,
  Save,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { GeminiService } from '@/services/gemini';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  ZoomIn,
} from 'react-native-reanimated';
import { FlashcardListItem } from '@/components/features/shared/FlashcardListItem';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Mode = 'manual' | 'ai' | 'import';
type CardCount = 10 | 25 | 50 | 100;

const CARD_COUNT_OPTIONS: CardCount[] = [10, 25, 50, 100];

// Small flag component for preview chips
const SmallFlag = ({ countryCode }: { countryCode: string }) => (
  <View style={{ width: 20, height: 14, borderRadius: 2, overflow: 'hidden' }}>
    <Image
      source={{ uri: `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` }}
      style={{ width: 20, height: 14 }}
      contentFit="cover"
    />
  </View>
);

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

// Input field component for consistency
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  autoCapitalize = 'sentences' as const,
  style = {},
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: any;
}) => {
  const { colors: Theme } = useTheme();
  return (
  <View style={[{ gap: 8 }, style]}>
    <Typography variant="label" color={Theme.textSecondary} style={{ marginLeft: 4 }}>
      {label}
    </Typography>
    <View
      style={{
        backgroundColor: Theme.card,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Theme.inputBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
      }}
    >
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        style={{
          color: Theme.text,
          padding: 16,
          fontSize: 16,
          height: multiline ? 100 : 52,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        placeholderTextColor={Theme.textMuted}
      />
    </View>
  </View>
  );
};

export default function CreateCollectionModal() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const [mode, setMode] = useState<Mode>('manual');

  // Shared State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLang, setSourceLang] = useState('PL');
  const [targetLang, setTargetLang] = useState('EN');

  // AI State
  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState<CardCount>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<{ front: string; back: string }[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Import State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [importSourceType, setImportSourceType] = useState<'image' | 'pdf' | null>(null);
  const [importStep, setImportStep] = useState<'capture' | 'generating' | 'preview'>('capture');
  const [importCards, setImportCards] = useState<{ front: string; back: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addCollection, addCollectionWithCards, generateFlashcardsFromAI, generateFlashcardsFromPDF } = useCollectionStore();

  // Animation values - smooth only
  const tabIndicatorX = useSharedValue(0);

  useEffect(() => {
    tabIndicatorX.value = withTiming(mode === 'manual' ? 0 : mode === 'ai' ? 1 : 2, { duration: 250 });
  }, [mode]);

  const tabIndicatorStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      tabIndicatorX.value,
      [0, 1, 2],
      [4, (SCREEN_WIDTH - 40 - 8) / 3 + 4, ((SCREEN_WIDTH - 40 - 8) / 3) * 2 + 4]
    );
    return {
      transform: [{ translateX }],
    };
  });

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCreateManual = async () => {
    if (!name || !sourceLang || !targetLang) return;
    try {
      setIsSubmitting(true);
      await addCollection(name, description, sourceLang, targetLang);
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic || !sourceLang || !targetLang) return;
    try {
      setIsGenerating(true);
      
      const cards = await GeminiService.generateCards(topic, sourceLang, targetLang, cardCount);
      setGeneratedCards(cards);

      if (!name) setName(topic.charAt(0).toUpperCase() + topic.slice(1));
      if (!description) setDescription(`Wygenerowano automatycznie z tematu: ${topic}`);

      setStep('preview');
    } catch (e: any) {
      Alert.alert('Błąd AI', e.message || 'Nie udało się wygenerować kart.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAI = async () => {
    if (!name || !generatedCards.length) return;
    try {
      setIsSubmitting(true);
      await addCollectionWithCards(name, description, sourceLang, targetLang, generatedCards);
      router.back();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać kolekcji.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const sourceLanguage = getLanguageByCode(sourceLang);
  const targetLanguage = getLanguageByCode(targetLang);

  // ─── Import Handlers ───

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnień', 'Aby robić zdjęcia, włącz dostęp do aparatu w ustawieniach.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnień', 'Aby wybrać zdjęcia, włącz dostęp do galerii w ustawieniach.');
          return;
        }
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const ext = asset.uri.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        setImageMimeType(mime);
        if (asset.base64) {
          setBase64Image(asset.base64);
        } else {
          const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
          setBase64Image(b64);
        }
        setImportSourceType('image');
        setPdfBase64(null);
        setPdfName(null);
      }
    } catch (e) {
      console.error('Image picker error:', e);
      Alert.alert('Błąd', 'Nie udało się załadować zdjęcia.');
    }
  };

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        setPdfBase64(b64);
        setPdfName(asset.name);
        setImportSourceType('pdf');
        setImageUri(null);
        setBase64Image(null);
      }
    } catch (e) {
      console.error('PDF picker error:', e);
      Alert.alert('Błąd', 'Nie udało się załadować pliku PDF.');
    }
  };

  const handleImportGenerate = async () => {
    if (!base64Image && !pdfBase64) return;
    try {
      setImportStep('generating');
      let cards;
      if (importSourceType === 'pdf' && pdfBase64) {
        cards = await generateFlashcardsFromPDF(pdfBase64, sourceLang, targetLang);
      } else if (base64Image) {
        cards = await generateFlashcardsFromAI(base64Image, imageMimeType, sourceLang, targetLang);
      }
      if (cards && cards.length > 0) {
        setImportCards(cards);
        if (!name) {
          const autoTitle = importSourceType === 'pdf' && pdfName
            ? pdfName.replace(/\.pdf$/i, '')
            : 'Import AI';
          setName(autoTitle);
        }
        if (!description) {
          setDescription(importSourceType === 'pdf'
            ? 'Wygenerowana przez AI z dokumentu PDF'
            : 'Wygenerowana przez AI ze zdjęcia');
        }
        setImportStep('preview');
      } else {
        Alert.alert('Brak wyników', 'AI nie znalazło fiszek w tym materiale.');
        setImportStep('capture');
      }
    } catch (e: any) {
      console.error('Import generate error:', e);
      Alert.alert('Błąd AI', e.message || 'Nie udało się wygenerować fiszek.');
      setImportStep('capture');
    }
  };

  const handleImportSave = async () => {
    if (!name || importCards.length === 0) return;
    try {
      setIsSubmitting(true);
      const desc = description || (importSourceType === 'pdf'
        ? 'Wygenerowana przez AI z dokumentu PDF'
        : 'Wygenerowana przez AI ze zdjęcia');
      await addCollectionWithCards(name, desc, sourceLang, targetLang, importCards);
      router.back();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać kolekcji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCardChange = (index: number, field: 'front' | 'back', text: string) => {
    const newCards = [...importCards];
    newCards[index] = { ...newCards[index], [field]: text };
    setImportCards(newCards);
  };

  const handleImportDeleteCard = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setImportCards(prev => prev.filter((_, i) => i !== index));
  };


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
          Nowa Kolekcja
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

      {/* Tab Switcher */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            padding: 4,
            borderRadius: Radius.xl,
            backgroundColor: Theme.backgroundAlt,
            borderWidth: 1,
            borderColor: Theme.border,
            position: 'relative',
          }}
        >
          {/* Animated Indicator */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 4,
                width: (SCREEN_WIDTH - 40 - 8) / 3,
                height: 44,
                backgroundColor: Theme.card,
                borderRadius: Radius.lg,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
              },
              tabIndicatorStyle,
            ]}
          />

          {/* Manual Tab */}
          <TouchableOpacity
            onPress={() => setMode('manual')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              zIndex: 1,
            }}
          >
            <PenLine size={16} color={mode === 'manual' ? Theme.text : Theme.textMuted} />
            <Typography
              variant="bodySemi"
              color={mode === 'manual' ? Theme.text : Theme.textMuted}
              style={{ fontSize: 14 }}
            >
              Ręcznie
            </Typography>
          </TouchableOpacity>

          {/* AI Magic Tab */}
          <TouchableOpacity
            onPress={() => setMode('ai')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              zIndex: 1,
            }}
          >
            <Sparkles size={16} color={mode === 'ai' ? Theme.primary : Theme.textMuted} />
            <Typography
              variant="bodySemi"
              color={mode === 'ai' ? Theme.primary : Theme.textMuted}
              style={{ fontSize: 14 }}
            >
              Magia AI
            </Typography>
          </TouchableOpacity>

          {/* Import Tab */}
          <TouchableOpacity
            onPress={() => setMode('import')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              zIndex: 1,
            }}
          >
            <Camera size={16} color={mode === 'import' ? Theme.primary : Theme.textMuted} />
            <Typography
              variant="bodySemi"
              color={mode === 'import' ? Theme.primary : Theme.textMuted}
              style={{ fontSize: 13 }}
            >
              Import
            </Typography>
          </TouchableOpacity>
        </View>
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
          {/* Language Selectors */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              {/* Source Language Picker */}
              <LanguagePicker
                value={sourceLang}
                onChange={setSourceLang}
                label="JĘZYK ŹRÓDŁOWY"
                placeholder="Wybierz język"
                excludeCode={targetLang}
              />

              {/* Swap Button */}
              <TouchableOpacity
                onPress={handleSwapLanguages}
                activeOpacity={0.7}
                style={{
                  width: 44,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Theme.primaryMuted,
                  borderRadius: Radius.lg,
                  borderWidth: 1,
                  borderColor: Theme.primaryLight,
                }}
              >
                <ArrowLeftRight size={18} color={Theme.primary} />
              </TouchableOpacity>

              {/* Target Language Picker */}
              <LanguagePicker
                value={targetLang}
                onChange={setTargetLang}
                label="JĘZYK DOCELOWY"
                placeholder="Wybierz język"
                excludeCode={sourceLang}
              />
            </View>

            {/* Language Preview Chips */}
            {sourceLanguage && targetLanguage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: Theme.card,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: Theme.border,
                  }}
                >
                  <SmallFlag countryCode={sourceLanguage.countryCode} />
                  <Typography variant="small" color={Theme.text}>
                    {sourceLanguage.nameEn}
                  </Typography>
                </View>

                <Typography variant="body" color={Theme.textMuted}>
                  →
                </Typography>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: Theme.primaryMuted,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: Theme.primaryLight,
                  }}
                >
                  <SmallFlag countryCode={targetLanguage.countryCode} />
                  <Typography variant="small" color={Theme.primary}>
                    {targetLanguage.nameEn}
                  </Typography>
                </View>
              </View>
            )}
          </View>

          {mode === 'manual' ? (
            <View style={{ gap: 24 }}>
              <InputField
                label="NAZWA KOLEKCJI"
                value={name}
                onChangeText={setName}
                placeholder="np. Słownictwo biznesowe"
              />

              <InputField
                label="OPIS (OPCJONALNIE)"
                value={description}
                onChangeText={setDescription}
                placeholder="Krótki opis kolekcji..."
                multiline
              />

              {/* Create Button - Primary color matching the app */}
              <TouchableOpacity
                onPress={handleCreateManual}
                disabled={isSubmitting || !name}
                activeOpacity={0.8}
                style={{
                  height: 56,
                  borderRadius: Radius.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 10,
                  marginTop: 8,
                  opacity: !name || isSubmitting ? 0.5 : 1,
                  backgroundColor: Theme.primary,
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
                    <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                    <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                      Stwórz Kolekcję
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : mode === 'ai' ? (
            <>
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
                          placeholder="np. Owoce"
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
                            AI stworzy {cardCount} unikalnych fiszek na wybrany temat.
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
                      <Typography variant="small" color={Theme.primary}>
                        Wróć
                      </Typography>
                    </TouchableOpacity>
                  </View>



                  {/* Collection Name Input */}
                  <View
                    style={{
                      backgroundColor: Theme.card,
                      borderRadius: Radius.lg,
                      borderWidth: 1,
                      borderColor: Theme.inputBorder,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.02,
                      shadowRadius: 2,
                    }}
                  >
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      style={{
                        color: Theme.text,
                        padding: 16,
                        fontSize: 17,
                        fontWeight: '600',
                      }}
                      placeholder="Nazwa kolekcji"
                      placeholderTextColor={Theme.textMuted}
                    />
                  </View>

                  {/* Generated Cards Preview */}
                  <View style={{ gap: 10 }}>
                    {generatedCards.map((card, index) => (
                      <View
                        key={index}
                        style={{
                          padding: 16,
                          borderRadius: Radius.lg,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: Theme.card,
                          borderWidth: 1,
                          borderColor: Theme.border,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.03,
                          shadowRadius: 3,
                        }}
                      >
                        <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
                          <Typography variant="bodySemi" color={Theme.text}>
                            {card.front}
                          </Typography>
                          <Typography variant="small" color={Theme.textSecondary}>
                            {card.back}
                          </Typography>
                        </View>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: Theme.successLight,
                          }}
                        >
                          <Check size={14} color={Theme.success} strokeWidth={2.5} />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={handleSaveAI}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: Theme.success,
                      height: 56,
                      borderRadius: Radius.xl,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 8,
                      shadowColor: Theme.success,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Typography
                        variant="bodySemi"
                        color="#FFFFFF"
                        style={{ fontSize: 17 }}
                      >
                        Zapisz Kolekcję
                      </Typography>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            /* ─── Import Mode ─── */
            <>
              {importStep === 'capture' ? (
                <View style={{ gap: Spacing.lg }}>
                  {/* ─── Hero gradient section ─── */}
                  <View style={{
                    borderRadius: Radius.xxl,
                    overflow: 'hidden',
                    shadowColor: Theme.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 24,
                    elevation: 8,
                  }}>
                    <LinearGradient
                      colors={[Theme.gradientMid, Theme.gradientStart, Theme.primarySoft]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: Spacing.xl,
                        position: 'relative',
                        minHeight: 320,
                      }}
                    >
                      {/* Floating sparkles */}
                      <FloatingSparkle delay={0} size={12} left={20} top={15} />
                      <FloatingSparkle delay={500} size={10} left={SCREEN_WIDTH - 100} top={25} />
                      <FloatingSparkle delay={1000} size={14} left={SCREEN_WIDTH - 140} top={100} />

                      {/* AI Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
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
                          <Typography variant="label" color="#FFFFFF" style={{ letterSpacing: 1 }}>
                            GEMINI AI VISION
                          </Typography>
                        </LinearGradient>
                      </View>

                      {/* Preview area */}
                      <View style={{
                        flex: 1,
                        minHeight: 200,
                        borderRadius: Radius.xl,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: Theme.primaryLight,
                        overflow: 'hidden',
                        backgroundColor: Theme.card,
                      }}>
                        {imageUri ? (
                          <Animated.View entering={ZoomIn.duration(400)} style={{ flex: 1 }}>
                            <RNImage source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </Animated.View>
                        ) : pdfName ? (
                          <Animated.View entering={ZoomIn.duration(400)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg }}>
                            <FileText size={48} color={Theme.primary} />
                            <Typography variant="h4" color={Theme.text} style={{ textAlign: 'center' }}>
                              {pdfName}
                            </Typography>
                            <Typography variant="body" color={Theme.textMuted} style={{ textAlign: 'center' }}>
                              Plik PDF gotowy do analizy
                            </Typography>
                          </Animated.View>
                        ) : (
                          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg }}>
                            <Sparkles size={48} color={Theme.primary} />
                            <Typography variant="h4" color={Theme.text} style={{ textAlign: 'center' }}>
                              Zrób zdjęcie lub wgraj PDF
                            </Typography>
                            <Typography variant="body" color={Theme.textMuted} style={{ textAlign: 'center', maxWidth: 220 }}>
                              AI wyciągnie kluczowe informacje i stworzy fiszki
                            </Typography>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </View>

                  {/* ─── Action buttons ─── */}
                  <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: Theme.card,
                        paddingVertical: Spacing.lg,
                        borderRadius: Radius.xl,
                        alignItems: 'center',
                        gap: Spacing.sm,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      onPress={() => pickImage(true)}
                      activeOpacity={0.7}
                    >
                      <Camera size={28} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>Aparat</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: Theme.card,
                        paddingVertical: Spacing.lg,
                        borderRadius: Radius.xl,
                        alignItems: 'center',
                        gap: Spacing.sm,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      onPress={() => pickImage(false)}
                      activeOpacity={0.7}
                    >
                      <ImageIcon size={28} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>Galeria</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: Theme.card,
                        paddingVertical: Spacing.lg,
                        borderRadius: Radius.xl,
                        alignItems: 'center',
                        gap: Spacing.sm,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      onPress={pickPDF}
                      activeOpacity={0.7}
                    >
                      <FileText size={28} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>PDF</Typography>
                    </TouchableOpacity>
                  </View>

                  {/* ─── Generate button ─── */}
                  {(imageUri || pdfBase64) && (
                    <TouchableOpacity
                      onPress={handleImportGenerate}
                      activeOpacity={0.85}
                      style={{
                        shadowColor: Theme.primary,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                      }}
                    >
                      <LinearGradient
                        colors={[Theme.primaryLight, Theme.primary, Theme.primaryDark]}
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
                        <Wand2 size={22} color="#FFFFFF" />
                        <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                          Wygeneruj Fiszki AI
                        </Typography>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              ) : importStep === 'generating' ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 20 }}>
                  <ActivityIndicator size="large" color={Theme.primary} />
                  <Typography variant="bodySemi" color={Theme.text}>AI analizuje materiał...</Typography>
                  <Typography variant="caption" color={Theme.textSecondary}>To może potrwać kilka sekund</Typography>
                </View>
              ) : (
                <View style={{ gap: Spacing.lg }}>
                  {/* ─── Review header ─── */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      <Typography variant="h3" color={Theme.text}>Podgląd</Typography>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: Theme.successLight,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: Radius.full,
                      }}>
                        <Check size={12} color={Theme.success} />
                        <Typography variant="label" color={Theme.success}>
                          {importCards.length} FISZEK
                        </Typography>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setImportStep('capture')}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md }}
                    >
                      <ChevronLeft size={18} color={Theme.primary} />
                      <Typography variant="bodySemi" color={Theme.primary}>Wstecz</Typography>
                    </TouchableOpacity>
                  </View>

                  {/* ─── Collection title input ─── */}
                  <View>
                    <Typography variant="label" color={Theme.textSecondary} style={{ marginBottom: Spacing.xs, letterSpacing: 0.5 }}>
                      NAZWA KOLEKCJI
                    </Typography>
                    <View style={{
                      backgroundColor: Theme.card,
                      borderRadius: Radius.lg,
                      borderWidth: 2,
                      borderColor: Theme.primaryLight,
                    }}>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Np. Historia - Rozdział 3"
                        placeholderTextColor={Theme.textMuted}
                        style={{
                          padding: Spacing.md,
                          fontSize: 18,
                          fontWeight: '600',
                          color: Theme.text,
                        }}
                      />
                    </View>
                  </View>

                  {/* ─── Card list ─── */}
                  <View style={{ gap: Spacing.md }}>
                    {importCards.map((card, index) => (
                      <FlashcardListItem
                        key={index}
                        front={card.front}
                        back={card.back}
                        index={index}
                        variant="editable"
                        onDelete={() => handleImportDeleteCard(index)}
                        onChangeFront={(t) => handleImportCardChange(index, 'front', t)}
                        onChangeBack={(t) => handleImportCardChange(index, 'back', t)}
                        animationDelay={100 + index * 80}
                      />
                    ))}
                  </View>

                  {/* ─── Save button ─── */}
                  <TouchableOpacity
                    onPress={handleImportSave}
                    disabled={isSubmitting || !name || importCards.length === 0}
                    activeOpacity={0.85}
                    style={{
                      shadowColor: Theme.success,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 8,
                      opacity: (!name || importCards.length === 0 || isSubmitting) ? 0.5 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={[Theme.success, Theme.successDark]}
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
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Save size={22} color="#FFFFFF" />
                          <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                            Zapisz {importCards.length} Fiszek
                          </Typography>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
