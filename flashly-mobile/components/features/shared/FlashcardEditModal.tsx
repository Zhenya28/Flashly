import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { X, Volume2, Wand2, ArrowDownUp } from 'lucide-react-native';
import { GoogleTTSService } from '@/services/tts';
import { TranslationService } from '@/services/translation';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

interface FlashcardEditModalProps {
  visible: boolean;
  onClose: () => void;
  card: { id: string; front: string; back: string } | null;
  sourceLang?: string;
  targetLang?: string;
  onSave: (id: string, front: string, back: string) => void;
}

export function FlashcardEditModal({
  visible,
  onClose,
  card,
  sourceLang = 'EN',
  targetLang = 'PL',
  onSave,
}: FlashcardEditModalProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
    }
  }, [card]);

  const handleSpeak = async (text: string, lang: string) => {
    if (!text.trim()) return;
    try {
      await GoogleTTSService.speak(text, lang);
    } catch (e) {
      console.error('TTS error:', e);
    }
  };

  const handleAutoTranslate = async () => {
    if (!front) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsTranslating(true);
    try {
      const translated = await TranslationService.translate(front, targetLang);
      if (translated) setBack(translated);
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = () => {
    if (!card || !front.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(card.id, front.trim(), back.trim());
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Typography variant="h3" color={Theme.text}>Edytuj Fiszkę</Typography>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {card && (
            <View style={{ gap: 16 }}>
              {/* Front Input */}
              <View style={{ gap: 8 }}>
                <View style={styles.labelRow}>
                  <Typography variant="caption" color={Theme.textSecondary} style={{ fontWeight: '600', letterSpacing: 0.5 }}>
                    PRZÓD ({sourceLang})
                  </Typography>
                  <TouchableOpacity
                    onPress={() => handleSpeak(front, sourceLang)}
                    style={styles.ttsBtn}
                  >
                    <Volume2 size={14} color={Theme.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={front}
                    onChangeText={setFront}
                    style={styles.input}
                    placeholderTextColor={Theme.textMuted}
                    placeholder="Wpisz słówko..."
                  />
                </View>
              </View>

              {/* Auto-Translate Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <TouchableOpacity
                  onPress={handleAutoTranslate}
                  disabled={isTranslating || !front}
                  style={[styles.translateBtn, (!front || isTranslating) && { opacity: 0.5 }]}
                >
                  {isTranslating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ArrowDownUp size={14} color="#FFFFFF" />
                  )}
                  <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700', letterSpacing: 0.3 }}>
                    Auto Tłumaczenie
                  </Typography>
                </TouchableOpacity>
              </View>

              {/* Back Input */}
              <View style={{ gap: 8 }}>
                <View style={styles.labelRow}>
                  <Typography variant="caption" color={Theme.textSecondary} style={{ fontWeight: '600', letterSpacing: 0.5 }}>
                    TYŁ ({targetLang})
                  </Typography>
                  <TouchableOpacity
                    onPress={() => handleSpeak(back, targetLang)}
                    style={styles.ttsBtn}
                  >
                    <Volume2 size={14} color={Theme.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={back}
                    onChangeText={setBack}
                    style={styles.input}
                    placeholderTextColor={Theme.textMuted}
                    placeholder="Tłumaczenie..."
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, !front.trim() && { opacity: 0.5 }]}
                disabled={!front.trim()}
                activeOpacity={0.9}
              >
                <Typography variant="bodySemi" color="#FFFFFF" style={{ fontSize: 16 }}>
                  Zapisz zmiany
                </Typography>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    backgroundColor: Theme.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ttsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: Theme.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 16,
  },
  input: {
    color: Theme.text,
    fontSize: 16,
    height: 50,
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  saveBtn: {
    backgroundColor: Theme.success,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
