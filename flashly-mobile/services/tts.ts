import { Audio } from 'expo-av';
import { getTTSCode } from '@/components/ui/LanguagePicker';

const GOOGLE_TTS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_TTS_API_KEY;
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export const GoogleTTSService = {
  async speak(text: string, languageCode: string) {
    if (!text) return;
    if (!GOOGLE_TTS_API_KEY) {
      console.warn('Google TTS API Key is missing');
      return;
    }

    try {
      // Convert 2-letter code to full TTS language code
      const ttsLanguageCode = getTTSCode(languageCode);

      // 1. Fetch Audio Content (Base64)
      const response = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_TTS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: ttsLanguageCode, ssmlGender: 'NEUTRAL' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google TTS API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent; // Base64 string

      if (!audioContent) throw new Error('No audio content received');

      // 2. Play Audio via Expo AV
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${audioContent}` },
        { shouldPlay: true }
      );
      
      // Auto-unload after playback to free resources
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('error' in status && status.error) {
          sound.unloadAsync();
        } else if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

    } catch (error) {
      console.error('TTS playback failed:', error);
      throw error;
    }
  }
};
