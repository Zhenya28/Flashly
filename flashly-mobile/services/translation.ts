import { getDeepLCode } from '@/components/ui/LanguagePicker';

const DEEPL_API_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

export const TranslationService = {
  async translate(text: string, targetLang: string) {
    if (!text) return '';
    if (!DEEPL_API_KEY) {
        console.warn('DeepL API Key is missing');
        return text;
    }

    try {
      // Get the proper DeepL language code
      const target = getDeepLCode(targetLang);

      const response = await fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: target,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepL Error Body:', errorText);
        throw new Error(`DeepL API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      // DeepL returns { translations: [{ detected_source_language: '...', text: '...' }] }
      return data.translations?.[0]?.text || '';
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  }
};
