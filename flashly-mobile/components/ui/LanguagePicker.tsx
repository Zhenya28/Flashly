import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useState, useMemo } from 'react';
import { Typography } from './Typography';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { ChevronDown, Search, Check, X, Globe } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Languages supported by BOTH Google TTS AND DeepL
export interface Language {
  code: string;        // ISO 639-1 code for storage
  name: string;        // Native name
  nameEn: string;      // English name
  countryCode: string; // ISO 3166-1 alpha-2 for flag
  ttsCode: string;     // Google TTS language code
  deeplCode: string;   // DeepL language code
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'BG', name: 'Български', nameEn: 'Bulgarian', countryCode: 'bg', ttsCode: 'bg-BG', deeplCode: 'BG' },
  { code: 'CS', name: 'Čeština', nameEn: 'Czech', countryCode: 'cz', ttsCode: 'cs-CZ', deeplCode: 'CS' },
  { code: 'DA', name: 'Dansk', nameEn: 'Danish', countryCode: 'dk', ttsCode: 'da-DK', deeplCode: 'DA' },
  { code: 'DE', name: 'Deutsch', nameEn: 'German', countryCode: 'de', ttsCode: 'de-DE', deeplCode: 'DE' },
  { code: 'EL', name: 'Ελληνικά', nameEn: 'Greek', countryCode: 'gr', ttsCode: 'el-GR', deeplCode: 'EL' },
  { code: 'EN', name: 'English', nameEn: 'English', countryCode: 'gb', ttsCode: 'en-US', deeplCode: 'EN-US' },
  { code: 'ES', name: 'Español', nameEn: 'Spanish', countryCode: 'es', ttsCode: 'es-ES', deeplCode: 'ES' },
  { code: 'ET', name: 'Eesti', nameEn: 'Estonian', countryCode: 'ee', ttsCode: 'et-EE', deeplCode: 'ET' },
  { code: 'FI', name: 'Suomi', nameEn: 'Finnish', countryCode: 'fi', ttsCode: 'fi-FI', deeplCode: 'FI' },
  { code: 'FR', name: 'Français', nameEn: 'French', countryCode: 'fr', ttsCode: 'fr-FR', deeplCode: 'FR' },
  { code: 'HU', name: 'Magyar', nameEn: 'Hungarian', countryCode: 'hu', ttsCode: 'hu-HU', deeplCode: 'HU' },
  { code: 'ID', name: 'Bahasa Indonesia', nameEn: 'Indonesian', countryCode: 'id', ttsCode: 'id-ID', deeplCode: 'ID' },
  { code: 'IT', name: 'Italiano', nameEn: 'Italian', countryCode: 'it', ttsCode: 'it-IT', deeplCode: 'IT' },
  { code: 'JA', name: '日本語', nameEn: 'Japanese', countryCode: 'jp', ttsCode: 'ja-JP', deeplCode: 'JA' },
  { code: 'KO', name: '한국어', nameEn: 'Korean', countryCode: 'kr', ttsCode: 'ko-KR', deeplCode: 'KO' },
  { code: 'LT', name: 'Lietuvių', nameEn: 'Lithuanian', countryCode: 'lt', ttsCode: 'lt-LT', deeplCode: 'LT' },
  { code: 'LV', name: 'Latviešu', nameEn: 'Latvian', countryCode: 'lv', ttsCode: 'lv-LV', deeplCode: 'LV' },
  { code: 'NB', name: 'Norsk', nameEn: 'Norwegian', countryCode: 'no', ttsCode: 'nb-NO', deeplCode: 'NB' },
  { code: 'NL', name: 'Nederlands', nameEn: 'Dutch', countryCode: 'nl', ttsCode: 'nl-NL', deeplCode: 'NL' },
  { code: 'PL', name: 'Polski', nameEn: 'Polish', countryCode: 'pl', ttsCode: 'pl-PL', deeplCode: 'PL' },
  { code: 'PT', name: 'Português', nameEn: 'Portuguese', countryCode: 'pt', ttsCode: 'pt-PT', deeplCode: 'PT-PT' },
  { code: 'RO', name: 'Română', nameEn: 'Romanian', countryCode: 'ro', ttsCode: 'ro-RO', deeplCode: 'RO' },
  { code: 'RU', name: 'Русский', nameEn: 'Russian', countryCode: 'ru', ttsCode: 'ru-RU', deeplCode: 'RU' },
  { code: 'SK', name: 'Slovenčina', nameEn: 'Slovak', countryCode: 'sk', ttsCode: 'sk-SK', deeplCode: 'SK' },
  { code: 'SL', name: 'Slovenščina', nameEn: 'Slovenian', countryCode: 'si', ttsCode: 'sl-SI', deeplCode: 'SL' },
  { code: 'SV', name: 'Svenska', nameEn: 'Swedish', countryCode: 'se', ttsCode: 'sv-SE', deeplCode: 'SV' },
  { code: 'TR', name: 'Türkçe', nameEn: 'Turkish', countryCode: 'tr', ttsCode: 'tr-TR', deeplCode: 'TR' },
  { code: 'UK', name: 'Українська', nameEn: 'Ukrainian', countryCode: 'ua', ttsCode: 'uk-UA', deeplCode: 'UK' },
  { code: 'ZH', name: '中文', nameEn: 'Chinese', countryCode: 'cn', ttsCode: 'zh-CN', deeplCode: 'ZH' },
];

// Helper to get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code.toUpperCase());
};

// Helper to get TTS code from language code
export const getTTSCode = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang?.ttsCode || 'en-US';
};

// Helper to get DeepL code from language code
export const getDeepLCode = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang?.deeplCode || 'EN-US';
};

// Flag component using flagcdn.com
const Flag = ({ countryCode, size = 24 }: { countryCode: string; size?: number }) => {
  const width = size * 1.5;
  const height = size;

  return (
    <View style={[styles.flagContainer, { width, height, borderRadius: 4 }]}>
      <Image
        source={{ uri: `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png` }}
        style={{ width, height }}
        contentFit="cover"
      />
    </View>
  );
};

interface LanguagePickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  placeholder?: string;
  excludeCode?: string;
}

export function LanguagePicker({
  value,
  onChange,
  label,
  placeholder = 'Wybierz język',
  excludeCode,
}: LanguagePickerProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLanguage = getLanguageByCode(value);

  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter(lang => {
      if (excludeCode && lang.code === excludeCode.toUpperCase()) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lang.name.toLowerCase().includes(query) ||
        lang.nameEn.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, excludeCode]);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery('');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSelect = (lang: Language) => {
    onChange(lang.code);
    handleClose();
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Typography variant="label" color={Theme.textSecondary} style={styles.label}>
          {label}
        </Typography>
      )}

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[
          styles.selector,
          {
            backgroundColor: Theme.card,
            borderColor: Theme.inputBorder,
            borderWidth: 1,
          },
        ]}
      >
        {selectedLanguage ? (
          <View style={styles.selectedContent}>
            <Flag countryCode={selectedLanguage.countryCode} size={22} />
            <View style={styles.selectedTextContainer}>
              <Typography variant="bodySemi" color={Theme.text} numberOfLines={1}>
                {selectedLanguage.name}
              </Typography>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <Globe size={20} color={Theme.textMuted} />
            <Typography variant="body" color={Theme.textMuted}>
              {placeholder}
            </Typography>
          </View>
        )}

        <ChevronDown size={18} color={Theme.textSecondary} />
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleClose}
          />

          <View style={[styles.modalContent, { backgroundColor: Theme.background }]}>
            {/* Handle bar */}
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: Theme.border }]} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Typography variant="h3" color={Theme.text}>
                {label || 'Wybierz język'}
              </Typography>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeButton, { backgroundColor: Theme.backgroundAlt }]}
              >
                <X size={20} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: Theme.card,
                  borderColor: Theme.inputBorder,
                },
              ]}
            >
              <Search size={20} color={Theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Szukaj języka..."
                placeholderTextColor={Theme.textMuted}
                style={[styles.searchInput, { color: Theme.text }]}
                autoFocus={false}
              />
            </View>

            {/* Language List */}
            <FlatList
              data={filteredLanguages}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.code === value.toUpperCase();
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.6}
                    style={[
                      styles.languageItem,
                      {
                        backgroundColor: isSelected ? Theme.primaryMuted : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? Theme.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    <Flag countryCode={item.countryCode} size={28} />
                    <View style={styles.itemTextContainer}>
                      <Typography
                        variant="bodySemi"
                        color={isSelected ? Theme.primary : Theme.text}
                      >
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color={Theme.textMuted}>
                        {item.nameEn}
                      </Typography>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkIcon, { backgroundColor: Theme.primary }]}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Globe size={48} color={Theme.textMuted} />
                  <Typography
                    variant="body"
                    color={Theme.textMuted}
                    align="center"
                    style={{ marginTop: 12 }}
                  >
                    Nie znaleziono języka
                  </Typography>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: 8,
  },
  label: {
    marginLeft: 4,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flagContainer: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTextContainer: {
    flex: 1,
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingBottom: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    gap: 14,
  },
  itemTextContainer: {
    flex: 1,
    gap: 1,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
});
