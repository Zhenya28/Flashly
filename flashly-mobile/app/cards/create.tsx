import { View, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, TextInput, Switch } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Typography } from '@/components/ui/Typography';
import { useCollectionStore } from '@/store/collectionStore';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { X, Wand2, Volume2, Layers, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBar } from 'expo-status-bar';
import { TranslationService } from '@/services/translation';
import { GoogleTTSService } from '@/services/tts';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

export default function CreateFlashcardScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSeriesMode, setIsSeriesMode] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const frontInputRef = useRef<TextInput>(null);

  const { addCard, collections, fetchCollections } = useCollectionStore();

  const collection = collections.find(c => c.id === collectionId);

  useEffect(() => {
     if (!collection) {
         fetchCollections();
     }
  }, [collectionId]);

  const handleCreate = async () => {
    if (!front || !back || !collectionId) return;
    try {
      setIsSubmitting(true);
      await addCard(collectionId, front, back);
      
      if (isSeriesMode) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1500);
          setFront('');
          setBack('');
          frontInputRef.current?.focus();
      } else {
          router.back();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Błąd', 'Nie udało się dodać fiszki.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTranslate = async () => {
     if (!front || !collection) return;
     try {
         setIsTranslating(true);
         const translated = await TranslationService.translate(front, collection.target_lang || 'EN');
         if (translated) {
             setBack(translated);
         }
     } catch (e: any) {
         console.error(e);
         Alert.alert('Błąd tłumaczenia', e.message || 'Sprawdź połączenie lub klucz API.');
     } finally {
         setIsTranslating(false);
     }
  };

  const handleSpeak = async (text: string, lang: string) => {
      if (!text) return;
      try {
          const map: Record<string, string> = { 'EN': 'en-US', 'PL': 'pl-PL', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'IT': 'it-IT' };
          const code = map[lang.toUpperCase()] || lang;
          await GoogleTTSService.speak(text, code);
      } catch (e) {
         Alert.alert('Błąd TTS', 'Nie udało się odtworzyć dźwięku.');
      }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{
        presentation: 'modal',
        headerShown: false,
        animation: 'slide_from_bottom'
      }} />

      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
        marginTop: Spacing.sm
      }}>
         <Typography variant="h2">Nowa Fiszka</Typography>
         <TouchableOpacity
            onPress={() => router.back()}
            style={{
              padding: Spacing.sm,
              backgroundColor: Theme.backgroundAlt,
              borderRadius: Radius.full
            }}
         >
            <X size={20} color={Theme.textSecondary} />
         </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            style={{ padding: Spacing.lg }}
            contentContainerStyle={{ gap: Spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* Series Mode Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Theme.card, padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: Theme.card, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: Theme.border }}>
                        <Layers size={20} color={Theme.text} />
                    </View>
                    <View>
                        <Typography variant="bodySemi" color={Theme.text}>Tryb seryjny</Typography>
                        <Typography variant="caption" color={Theme.textMuted}>Dodawaj masowo</Typography>
                    </View>
                </View>
                <Switch 
                    value={isSeriesMode} 
                    onValueChange={setIsSeriesMode} 
                    trackColor={{ false: Theme.border, true: Theme.primary }}
                    thumbColor={Theme.card}
                />
            </View>

             {/* Front Side */}
             <View>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm, alignItems: 'center' }}>
                    <View style={{
                      backgroundColor: Theme.primaryMuted,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: Spacing.xs,
                      borderRadius: Radius.full
                    }}>
                      <Typography variant="caption" color={Theme.primaryDark} style={{ fontWeight: '600' }}>
                      PRZÓD ({collection?.source_lang || '?'})
                      </Typography>
                    </View>
                    <TouchableOpacity
                    onPress={() => handleSpeak(front, collection?.source_lang || 'en')}
                      style={{ padding: Spacing.xs }}
                    >
                        <Volume2 size={20} color={Theme.textMuted} />
                    </TouchableOpacity>
                 </View>
                 <GlassCard variant="outlined" padding="none">
                     <TextInput
                        ref={frontInputRef}
                        placeholder="Wpisz słówko..."
                        value={front}
                        onChangeText={setFront}
                        autoFocus
                        multiline
                        style={{
                          color: Theme.text,
                          fontSize: 18,
                          textAlign: 'center',
                          minHeight: 120,
                          padding: Spacing.md,
                        }}
                        placeholderTextColor={Theme.textMuted}
                     />
                 </GlassCard>
             </View>

             {/* Back Side */}
             <View>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm, alignItems: 'center' }}>
                    <View style={{
                      backgroundColor: Theme.successLight,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: Spacing.xs,
                      borderRadius: Radius.full
                    }}>
                      <Typography variant="caption" color={Theme.success} style={{ fontWeight: '600' }}>
                          TYŁ ({collection?.target_lang || '?'})
                      </Typography>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={handleTranslate}
                            disabled={isTranslating || !front}
                            style={{
                              backgroundColor: Theme.primaryMuted,
                              paddingHorizontal: Spacing.sm,
                              paddingVertical: Spacing.xs,
                              borderRadius: Radius.md,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              opacity: (isTranslating || !front) ? 0.5 : 1
                            }}
                        >
                            {isTranslating ? (
                              <ActivityIndicator size="small" color={Theme.primary} />
                            ) : (
                              <Wand2 size={14} color={Theme.primary} />
                            )}
                            <Typography variant="caption" color={Theme.primary} style={{ fontWeight: '700' }}>AUTO</Typography>
                        </TouchableOpacity>

                        <TouchableOpacity
                        onPress={() => handleSpeak(back, collection?.target_lang || 'en')}
                          style={{ padding: Spacing.xs }}
                        >
                            <Volume2 size={20} color={Theme.textMuted} />
                        </TouchableOpacity>
                    </View>
                 </View>
                 <GlassCard variant="outlined" padding="none">
                     <TextInput
                        placeholder="Wpisz tłumaczenie..."
                        value={back}
                        onChangeText={setBack}
                        multiline
                        style={{
                          color: Theme.text,
                          fontSize: 18,
                          textAlign: 'center',
                          minHeight: 120,
                          padding: Spacing.md,
                        }}
                        placeholderTextColor={Theme.textMuted}
                     />
                 </GlassCard>
             </View>

             <Button
                onPress={handleCreate}
                variant="primary"
                size="lg"
                disabled={isSubmitting || !front || !back}
                loading={isSubmitting}
                style={{ marginTop: Spacing.sm }}
             >
                Dodaj fiszkę
             </Button>
          </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Toast */}
      {showSuccess && (
        <Animated.View
          entering={ZoomIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute',
            top: '45%',
            alignSelf: 'center',
            backgroundColor: Theme.success,
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderRadius: Radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: Theme.success,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Check size={20} color={Theme.textInverse} />
          <Typography variant="bodySemi" color={Theme.textInverse}>Fiszka dodana!</Typography>
        </Animated.View>
      )}
    </View>
  );
}
