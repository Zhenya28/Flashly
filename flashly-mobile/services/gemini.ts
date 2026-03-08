const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

// Resolve 2-letter code to full language name for clear Gemini prompts
import { getLanguageByCode } from '@/components/ui/LanguagePicker';
const resolveLanguageName = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang?.nameEn || code;
};

async function callGemini(prompt: string, retryCount = 0): Promise<string> {
  if (!API_KEY) {
    throw new Error("Brak klucza API Gemini. Dodaj EXPO_PUBLIC_GEMINI_API_KEY do pliku .env");
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error Body:", errorText);

    // Retry on transient errors
    if ([429, 500, 503].includes(response.status) && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || 4000;
      console.log(`Retrying Gemini in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGemini(prompt, retryCount + 1);
    }

    if (response.status === 429) {
      throw new Error("Wyczerpano limit zapytań Gemini. Odczekaj chwilę i spróbuj ponownie.");
    }
    if (response.status === 503) {
      throw new Error("Serwery Gemini są przeciążone. Spróbuj później.");
    }

    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("No content generated");

  // Clean up potential markdown code blocks
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

async function callGeminiWithImage(base64Image: string, mimeType: string, prompt: string, retryCount = 0): Promise<string> {
  if (!API_KEY) {
    throw new Error("Brak klucza API Gemini. Dodaj EXPO_PUBLIC_GEMINI_API_KEY do pliku .env");
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Vision API Error:", errorText);

    if ([429, 500, 503].includes(response.status) && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || 4000;
      console.log(`Retrying Gemini Vision in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithImage(base64Image, mimeType, prompt, retryCount + 1);
    }

    if (response.status === 429) {
      throw new Error("Wyczerpano limit zapytań Gemini. Odczekaj chwilę i spróbuj ponownie.");
    }
    if (response.status === 503) {
      throw new Error("Serwery Gemini są przeciążone. Spróbuj później.");
    }

    throw new Error(`Gemini Vision API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("No content generated from image");

  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

export const GeminiService = {
  async generateCards(topic: string, sourceLang: string, targetLang: string, count: number = 10) {
    const srcName = resolveLanguageName(sourceLang);
    const tgtName = resolveLanguageName(targetLang);
    const prompt = `
      You are a helpful language tutor. Create a list of ${count} flashcards for learning "${topic}".
      Source Language: ${srcName} (Front of card)
      Target Language: ${tgtName} (Back of card - translation)

      Output strictly a valid JSON array of objects with "front" and "back" keys.
      Do not include any markdown formatting (like \`\`\`json). Just the raw JSON array string.
      Example: [{"front": "Kot", "back": "Cat"}]
    `;

    try {
      const cleanText = await callGemini(prompt);

      let cards;
      try {
        cards = JSON.parse(cleanText);
      } catch (e) {
        console.error("JSON Parse Error. Raw Text:", cleanText);
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!Array.isArray(cards)) throw new Error("Invalid response format (not an array)");

      return cards as { front: string; back: string }[];
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  },

  /**
   * Generate flashcards from an image (photo of notes, textbook, etc.)
   * Uses Gemini Vision to analyze the image and create flashcards
   */
  async generateCardsFromImage(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    sourceLang: string = 'EN',
    targetLang: string = 'PL'
  ): Promise<{ front: string; back: string }[]> {
    const srcName = resolveLanguageName(sourceLang);
    const tgtName = resolveLanguageName(targetLang);
    const prompt = `You are an intelligent flashcard creator. Analyze this image carefully.
It may contain notes, text from a textbook, vocabulary lists, or handwritten content.

Extract the key concepts, terms, definitions, or vocabulary from the image.
Create flashcards where:
- "front" = the term, word, or question in ${srcName}
- "back" = the translation, definition, or answer in ${tgtName}

IMPORTANT: The front MUST be in ${srcName} and the back MUST be in ${tgtName}.
If the source material is in a different language, translate accordingly.

Rules:
- Create 5-20 flashcards depending on the amount of content in the image
- Each flashcard should cover a distinct concept
- Keep answers concise but complete
- If the image contains vocabulary, create word-translation pairs
- If the image contains notes/definitions, create term-definition pairs
- If the image is unclear, extract what you can

Output ONLY a valid JSON array. No markdown, no explanation.
Example: [{"front": "Cat", "back": "Kot"}]`;

    try {
      const cleanText = await callGeminiWithImage(base64Image, mimeType, prompt);

      let cards;
      try {
        cards = JSON.parse(cleanText);
      } catch (e) {
        console.error("JSON Parse Error from image. Raw Text:", cleanText);
        throw new Error("Nie udało się przetworzyć odpowiedzi AI");
      }

      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error("AI nie wykryło treści na zdjęciu. Spróbuj wyraźniejsze zdjęcie.");
      }

      // Validate each card has front and back as non-empty strings
      const validCards = cards.filter((c: any) =>
        c.front && c.back &&
        typeof c.front === 'string' && typeof c.back === 'string' &&
        c.front.trim().length > 0 && c.back.trim().length > 0
      ).map((c: any) => ({ front: c.front.trim(), back: c.back.trim() }));

      if (validCards.length === 0) {
        throw new Error("AI nie wykryło treści na zdjęciu. Spróbuj wyraźniejsze zdjęcie.");
      }

      return validCards;
    } catch (error) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  },

  /**
   * Generate flashcards from a PDF document
   * Uses Gemini to analyze the PDF content and create flashcards
   */
  async generateCardsFromPDF(
    base64PDF: string,
    sourceLang: string = 'EN',
    targetLang: string = 'PL'
  ): Promise<{ front: string; back: string }[]> {
    const srcName = resolveLanguageName(sourceLang);
    const tgtName = resolveLanguageName(targetLang);
    const prompt = `You are an intelligent flashcard creator. Analyze this PDF document carefully.
It may contain notes, textbook content, vocabulary lists, definitions, or study material.

Extract the key concepts, terms, definitions, or vocabulary from the document.
Create flashcards where:
- "front" = the term, word, or key concept in ${srcName}
- "back" = the translation, definition, or answer in ${tgtName}

IMPORTANT: The front MUST be in ${srcName} and the back MUST be in ${tgtName}.
If the source material is in a different language, translate accordingly.

Rules:
- Create 10-30 flashcards depending on the amount of content in the PDF
- Each flashcard should cover a distinct concept
- Keep answers concise but complete
- If the document contains vocabulary, create word-translation pairs
- If the document contains notes/definitions, create term-definition pairs
- Focus on the most important and study-worthy content
- Skip headers, footers, page numbers, and irrelevant formatting

Output ONLY a valid JSON array. No markdown, no explanation.
Example: [{"front": "Cat", "back": "Kot"}]`;

    try {
      const cleanText = await callGeminiWithImage(base64PDF, 'application/pdf', prompt);

      let cards;
      try {
        cards = JSON.parse(cleanText);
      } catch (e) {
        console.error("JSON Parse Error from PDF. Raw Text:", cleanText);
        throw new Error("Nie udało się przetworzyć odpowiedzi AI");
      }

      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error("AI nie wykryło treści w PDF. Spróbuj inny plik.");
      }

      const validCards = cards.filter((c: any) =>
        c.front && c.back &&
        typeof c.front === 'string' && typeof c.back === 'string' &&
        c.front.trim().length > 0 && c.back.trim().length > 0
      ).map((c: any) => ({ front: c.front.trim(), back: c.back.trim() }));

      if (validCards.length === 0) {
        throw new Error("AI nie wykryło treści w PDF. Spróbuj inny plik.");
      }

      return validCards;
    } catch (error) {
      console.error("Gemini PDF Generation Error:", error);
      throw error;
    }
  },

  /**
   * Generate "tricky" distractors for quiz mode
   * Returns words similar in spelling/sound to the correct answer
   */
  async generateDistractors(
    correctAnswer: string,
    language: string,
    count: number = 3
  ): Promise<string[]> {
    const prompt = `Generate ${count} WRONG answers (distractors) for a language quiz.

The CORRECT answer is: "${correctAnswer}" (in ${language})

Requirements for distractors:
- Must be REAL words in ${language}
- Should be similar to "${correctAnswer}" in spelling OR sound (tricky but fair)
- Must NOT be the same as "${correctAnswer}"
- Should be believable wrong answers

Good distractors for "Cat": "Cut", "Cot", "Kit" (similar spelling/sound)
Good distractors for "House": "Horse", "Mouse", "Hose" (similar sound/rhyme)

Output ONLY a JSON array of ${count} strings. No markdown, no explanation.
Example: ["Cut", "Cot", "Kit"]`;

    try {
      const cleanText = await callGemini(prompt);

      const distractors = JSON.parse(cleanText);

      if (!Array.isArray(distractors)) return [];

      // Filter out any that accidentally match the correct answer
      return distractors
        .filter((d: string) => d.toLowerCase() !== correctAnswer.toLowerCase())
        .slice(0, count);
    } catch (error) {
      console.error("Gemini Distractor Error:", error);
      return [];
    }
  }
};
