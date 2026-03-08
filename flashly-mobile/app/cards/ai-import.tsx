
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui/Typography';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  ArrowLeft, Camera, Image as ImageIcon, Sparkles, Save, Wand2,
  Stars, ChevronLeft, Trophy, Zap, Star, Brain, Target, Check, FileText,
} from 'lucide-react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect, useCallback } from 'react';
import { useCollectionStore } from '@/store/collectionStore';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInDown, FadeIn, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withDelay, withRepeat, withSequence, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashcardListItem } from '@/components/features/shared/FlashcardListItem';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Inline animated components ───

const FloatingSparkle = ({ delay, size, left, top }: {
  delay: number; size: number; left: number; top: number;
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
        -1, true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top }, animatedStyle]}>
      <Sparkles size={size} color={Theme.primary} />
    </Animated.View>
  );
};

const FloatingParticle = ({ delay: d, startX, startY, size, color, duration, IconComponent }: {
  delay: number; startX: number; startY: number; size: number;
  color: string; duration: number; IconComponent: React.ComponentType<any>;
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(d, withTiming(0.7, { duration: 400 }));
    scale.value = withDelay(d, withSpring(1, { damping: 8 }));
    translateY.value = withDelay(d,
      withRepeat(withSequence(
        withTiming(-35, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ), -1, true)
    );
    translateX.value = withDelay(d,
      withRepeat(withSequence(
        withTiming(18, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
        withTiming(-18, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) })
      ), -1, true)
    );
    rotate.value = withDelay(d,
      withRepeat(withTiming(360, { duration: duration * 3, easing: Easing.linear }), -1, false)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: startX, top: startY }, animatedStyle]}>
      <IconComponent size={size} color={color} />
    </Animated.View>
  );
};

const LoadingDot = ({ delay: d }: { delay: number }) => {
  const { colors: Theme, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(d,
      withRepeat(withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ), -1, true)
    );
    opacity.value = withDelay(d,
      withRepeat(withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.3, { duration: 500 })
      ), -1, true)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

// ─── Progress messages ───

const PROGRESS_MESSAGES = [
  'Rozpoznawanie tekstu...',
  'Wyodrębnianie kluczowych pojęć...',
  'Tworzenie fiszek...',
  'Prawie gotowe...',
];

const PDF_PROGRESS_MESSAGES = [
  'Czytanie dokumentu PDF...',
  'Analizowanie treści...',
  'Wyodrębnianie kluczowych pojęć...',
  'Tworzenie fiszek...',
  'Prawie gotowe...',
];

// ─── Main component ───

type Step = 'capture' | 'generating' | 'review' | 'success';

export default function AIImportScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const { generateFlashcardsFromAI, generateFlashcardsFromPDF, addCollectionWithCards, addCardsBatch, fetchCards } = useCollectionStore();

  // Route params — when coming from an existing collection
  const params = useLocalSearchParams<{ collectionId?: string; sourceLang?: string; targetLang?: string }>();
  const existingCollectionId = params.collectionId || null;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'image' | 'pdf' | null>(null);
  const [step, setStep] = useState<Step>('capture');
  const [generatedCards, setGeneratedCards] = useState<{ front: string; back: string }[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0]);
  const [sourceLang, setSourceLang] = useState(params.sourceLang || 'EN');
  const [targetLang, setTargetLang] = useState(params.targetLang || 'PL');

  // Cycle progress messages during generation
  useEffect(() => {
    if (step !== 'generating') return;
    const messages = sourceType === 'pdf' ? PDF_PROGRESS_MESSAGES : PROGRESS_MESSAGES;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setProgressMessage(messages[index]);
    }, 2500);
    return () => clearInterval(interval);
  }, [step, sourceType]);

  // ─── Handlers ───

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
        setSourceType('image');
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
        setSourceType('pdf');
        setImageUri(null);
        setBase64Image(null);
      }
    } catch (e) {
      console.error('PDF picker error:', e);
      Alert.alert('Błąd', 'Nie udało się załadować pliku PDF.');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!base64Image && !pdfBase64) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('generating');
    setProgressMessage(sourceType === 'pdf' ? PDF_PROGRESS_MESSAGES[0] : PROGRESS_MESSAGES[0]);

    try {
      let cards;
      if (sourceType === 'pdf' && pdfBase64) {
        cards = await generateFlashcardsFromPDF(pdfBase64, sourceLang, targetLang);
      } else if (base64Image) {
        cards = await generateFlashcardsFromAI(base64Image, imageMimeType, sourceLang, targetLang);
      }

      if (!cards || cards.length === 0) {
        Alert.alert('Brak treści', sourceType === 'pdf'
          ? 'AI nie wykryło treści w PDF. Spróbuj inny plik.'
          : 'AI nie wykryło tekstu na zdjęciu. Spróbuj wyraźniejsze zdjęcie.');
        setStep('capture');
        return;
      }

      setGeneratedCards(cards);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProgressMessage('Gotowe!');
      setTimeout(() => setStep('review'), 600);
    } catch (e) {
      console.error('Generation error:', e);
      Alert.alert('Błąd AI', 'Nie udało się wygenerować fiszek. Spróbuj ponownie.');
      setStep('capture');
    }
  }, [base64Image, pdfBase64, sourceType, imageMimeType, sourceLang, targetLang, generateFlashcardsFromAI, generateFlashcardsFromPDF]);

  const handleSave = useCallback(async () => {
    if (!existingCollectionId && !collectionTitle.trim()) {
      Alert.alert('Uwaga', 'Podaj nazwę kolekcji.');
      return;
    }
    if (generatedCards.length === 0) {
      Alert.alert('Uwaga', 'Brak fiszek do zapisania.');
      return;
    }

    try {
      if (existingCollectionId) {
        // Add cards to existing collection
        await addCardsBatch(existingCollectionId, generatedCards);
        await fetchCards(existingCollectionId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        // Create new collection with cards
        const description = sourceType === 'pdf'
          ? 'Wygenerowana przez AI z dokumentu PDF'
          : 'Wygenerowana przez AI ze zdjęcia';
        await addCollectionWithCards(collectionTitle, description, sourceLang, targetLang, generatedCards);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('success');
      }
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Błąd', 'Nie udało się zapisać fiszek.');
    }
  }, [existingCollectionId, collectionTitle, generatedCards, sourceLang, targetLang, addCollectionWithCards, addCardsBatch, fetchCards, sourceType]);

  const handleCardChange = (index: number, field: 'front' | 'back', text: string) => {
    const newCards = [...generatedCards];
    newCards[index] = { ...newCards[index], [field]: text };
    setGeneratedCards(newCards);
  };

  const handleDeleteCard = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGeneratedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setStep('capture');
    setImageUri(null);
    setBase64Image(null);
    setPdfBase64(null);
    setPdfName(null);
    setSourceType(null);
    setGeneratedCards([]);
    setCollectionTitle('');
    setSourceLang('EN');
    setTargetLang('PL');
  };

  // ─── Render: Generating (fullscreen overlay) ───

  if (step === 'generating') {
    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />

        {/* Floating particles */}
        <FloatingParticle delay={0} startX={SCREEN_WIDTH * 0.15} startY={SCREEN_HEIGHT * 0.2} size={16} color={Theme.primary} duration={2000} IconComponent={Sparkles} />
        <FloatingParticle delay={300} startX={SCREEN_WIDTH * 0.82} startY={SCREEN_HEIGHT * 0.15} size={20} color={Theme.warning} duration={2400} IconComponent={Star} />
        <FloatingParticle delay={600} startX={SCREEN_WIDTH * 0.1} startY={SCREEN_HEIGHT * 0.6} size={14} color={Theme.info} duration={2200} IconComponent={Brain} />
        <FloatingParticle delay={900} startX={SCREEN_WIDTH * 0.85} startY={SCREEN_HEIGHT * 0.55} size={18} color={Theme.accent4} duration={2600} IconComponent={Zap} />
        <FloatingParticle delay={1200} startX={SCREEN_WIDTH * 0.4} startY={SCREEN_HEIGHT * 0.72} size={14} color={Theme.secondary} duration={2100} IconComponent={Target} />

        <View style={styles.generatingCenter}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.generatingContent}>
            {/* AI icon circle */}
            <View style={styles.aiCircleOuter}>
              <LinearGradient
                colors={[Theme.primaryLight, Theme.primary]}
                style={styles.aiCircleGradient}
              >
                <Sparkles size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Typography variant="h2" color={Theme.text} style={{ textAlign: 'center' }}>
              {sourceType === 'pdf' ? 'AI analizuje PDF' : 'AI analizuje zdjęcie'}
            </Typography>

            <Typography variant="body" color={Theme.textMuted} style={{ textAlign: 'center' }}>
              {progressMessage}
            </Typography>

            <View style={styles.dotsRow}>
              <LoadingDot delay={0} />
              <LoadingDot delay={150} />
              <LoadingDot delay={300} />
            </View>
          </Animated.View>
        </View>
      </GradientBackground>
    );
  }

  // ─── Render: Success celebration ───

  if (step === 'success') {
    return (
      <GradientBackground variant="subtle">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.successContainer} edges={['top', 'bottom']}>
          {/* Trophy */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.trophyWrapper}>
            <View style={styles.trophyCircle}>
              <Trophy size={48} color={Theme.success} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350)}>
            <Typography variant="h1" color={Theme.text} style={{ textAlign: 'center' }}>
              Kolekcja utworzona!
            </Typography>
            <Typography variant="body" color={Theme.textMuted} style={{ textAlign: 'center', marginTop: 8 }}>
              {generatedCards.length} fiszek gotowych do nauki
            </Typography>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.statsRow}>
            <GlassCard padding="md" style={styles.statCard}>
              <Sparkles size={28} color={Theme.primary} />
              <Typography variant="h2" color={Theme.primary}>
                {generatedCards.length}
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                Nowe fiszki
              </Typography>
            </GlassCard>

            <GlassCard padding="md" style={styles.statCard}>
              <Zap size={28} color={Theme.warning} />
              <Typography variant="h2" color={Theme.warning}>
                ~{Math.max(1, Math.round(generatedCards.length * 0.3))}min
              </Typography>
              <Typography variant="caption" color={Theme.textMuted}>
                Zaoszczędzono
              </Typography>
            </GlassCard>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(650)} style={styles.successActions}>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.85}>
              <LinearGradient
                colors={[Theme.primary, Theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successPrimaryBtn}
              >
                <Typography variant="bodySemi" color="#FFFFFF">
                  Wróć do kolekcji
                </Typography>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.successSecondaryBtn}>
              <Typography variant="bodySemi" color={Theme.primary}>
                Importuj więcej
              </Typography>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ─── Render: Capture & Review (scrollable) ───

  return (
    <GradientBackground variant="subtle">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBackBtn}>
            <ArrowLeft size={24} color={Theme.text} />
          </TouchableOpacity>
          <Typography variant="h3">AI Import</Typography>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'capture' ? (
            <View style={{ gap: Spacing.lg }}>
              {/* ─── Hero gradient section ─── */}
              <View style={styles.heroShadow}>
                <LinearGradient
                  colors={[Theme.gradientMid, Theme.gradientStart, Theme.primarySoft]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroGradient}
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
                      style={styles.aiBadge}
                    >
                      <Stars size={14} color="#FFFFFF" />
                      <Typography variant="label" color="#FFFFFF" style={{ letterSpacing: 1 }}>
                        GEMINI AI VISION
                      </Typography>
                    </LinearGradient>
                  </View>

                  {/* Preview area */}
                  <View style={styles.imagePreviewArea}>
                    {imageUri ? (
                      <Animated.View entering={ZoomIn.duration(400)} style={styles.previewImageWrap}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                      </Animated.View>
                    ) : pdfName ? (
                      <Animated.View entering={ZoomIn.duration(400)} style={styles.placeholderContent}>
                        <FileText size={48} color={Theme.primary} />
                        <Typography variant="h4" color={Theme.text} style={{ textAlign: 'center' }}>
                          {pdfName}
                        </Typography>
                        <Typography variant="body" color={Theme.textMuted} style={{ textAlign: 'center' }}>
                          Plik PDF gotowy do analizy
                        </Typography>
                      </Animated.View>
                    ) : (
                      <View style={styles.placeholderContent}>
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
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(true)} activeOpacity={0.7}>
                  <Camera size={28} color={Theme.primary} />
                  <Typography variant="bodySemi" color={Theme.primary}>Aparat</Typography>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(false)} activeOpacity={0.7}>
                  <ImageIcon size={28} color={Theme.primary} />
                  <Typography variant="bodySemi" color={Theme.primary}>Galeria</Typography>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={pickPDF} activeOpacity={0.7}>
                  <FileText size={28} color={Theme.primary} />
                  <Typography variant="bodySemi" color={Theme.primary}>PDF</Typography>
                </TouchableOpacity>
              </View>

              {/* ─── Language selection (only when creating new collection) ─── */}
              {!existingCollectionId && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ gap: Spacing.sm }}>
                <Typography variant="label" color={Theme.textSecondary} style={{ letterSpacing: 0.5 }}>
                  JĘZYKI
                </Typography>
                <View style={{ gap: Spacing.sm }}>
                  <LanguagePicker
                    value={sourceLang}
                    onChange={setSourceLang}
                    label="Język źródłowy"
                  />
                  <LanguagePicker
                    value={targetLang}
                    onChange={setTargetLang}
                    label="Język docelowy"
                  />
                </View>
              </Animated.View>
              )}

              {/* ─── Generate button ─── */}
              {(imageUri || pdfBase64) && (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <TouchableOpacity onPress={handleGenerate} activeOpacity={0.85} style={styles.generateShadow}>
                    <LinearGradient
                      colors={[Theme.primaryLight, Theme.primary, Theme.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.generateBtn}
                    >
                      <Wand2 size={22} color="#FFFFFF" />
                      <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                        Wygeneruj Fiszki AI
                      </Typography>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          ) : step === 'review' ? (
            <View style={{ gap: Spacing.lg }}>
              {/* ─── Review header ─── */}
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderLeft}>
                  <Typography variant="h3" color={Theme.text}>Podgląd</Typography>
                  <View style={styles.countBadge}>
                    <Check size={12} color={Theme.success} />
                    <Typography variant="label" color={Theme.success}>
                      {generatedCards.length} FISZEK
                    </Typography>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setStep('capture')}
                  activeOpacity={0.7}
                  style={styles.backTextBtn}
                >
                  <ChevronLeft size={18} color={Theme.primary} />
                  <Typography variant="bodySemi" color={Theme.primary}>Wstecz</Typography>
                </TouchableOpacity>
              </View>

              {/* ─── Collection title input (only for new collections) ─── */}
              {!existingCollectionId && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Typography variant="label" color={Theme.textSecondary} style={styles.inputLabel}>
                  NAZWA KOLEKCJI
                </Typography>
                <View style={styles.titleInputWrap}>
                  <TextInput
                    value={collectionTitle}
                    onChangeText={setCollectionTitle}
                    placeholder="Np. Historia - Rozdział 3"
                    placeholderTextColor={Theme.textMuted}
                    style={styles.titleInput}
                  />
                </View>
              </Animated.View>
              )}

              {/* ─── Card list ─── */}
              <View style={{ gap: Spacing.md }}>
                {generatedCards.map((card, index) => (
                  <FlashcardListItem
                    key={index}
                    front={card.front}
                    back={card.back}
                    index={index}
                    variant="editable"
                    onDelete={() => handleDeleteCard(index)}
                    onChangeFront={(t) => handleCardChange(index, 'front', t)}
                    onChangeBack={(t) => handleCardChange(index, 'back', t)}
                    animationDelay={100 + index * 80}
                  />
                ))}
              </View>

              {/* ─── Save button ─── */}
              <Animated.View entering={FadeInDown.delay(200 + generatedCards.length * 80).duration(500)}>
                <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveShadow}>
                  <LinearGradient
                    colors={[Theme.success, Theme.successDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveBtn}
                  >
                    <Save size={22} color="#FFFFFF" />
                    <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 17 }}>
                      {existingCollectionId ? `Dodaj ${generatedCards.length} Fiszek` : `Zapisz ${generatedCards.length} Fiszek`}
                    </Typography>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

// ─── Styles ───

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  navBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Theme.card,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },

  // Hero
  heroShadow: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  heroGradient: {
    padding: Spacing.xl,
    position: 'relative',
    minHeight: 320,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  imagePreviewArea: {
    flex: 1,
    minHeight: 200,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Theme.primaryLight,
    overflow: 'hidden',
    backgroundColor: Theme.card,
  },
  previewImageWrap: { flex: 1 },
  previewImage: { width: '100%', height: '100%' },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Theme.card,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...shadows.md,
  },

  // Generate button
  generateShadow: {
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  generateBtn: {
    height: 60,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // Generating screen
  generatingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  generatingContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  aiCircleOuter: {
    width: 96, height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...shadows.glow,
  },
  aiCircleGradient: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: Theme.primary,
  },

  // Review
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  backTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  titleInputWrap: {
    backgroundColor: Theme.card,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Theme.primaryLight,
  },
  titleInput: {
    padding: Spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text,
  },
  // Save button
  saveShadow: {
    shadowColor: Theme.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveBtn: {
    height: 60,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  trophyWrapper: {
    marginBottom: Spacing.xl,
  },
  trophyCircle: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: Theme.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  successActions: {
    width: '100%',
    gap: Spacing.md,
  },
  successPrimaryBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  successSecondaryBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    alignItems: 'center',
    backgroundColor: Theme.primaryMuted,
  },
});
