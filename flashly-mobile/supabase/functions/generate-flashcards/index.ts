
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file, mimeType, prompt, targetLang = 'EN' } = await req.json()

    if (!file) {
      throw new Error('No file provided')
    }

    // Retrieve API Key from Secrets
    // User needs to set GEMINI_API_KEY in Supabase Dashboard
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured in Supabase Secrets')
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use a model that supports vision (Gemini 1.5 Flash is fast and good for this)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construct the prompt
    let fullPrompt = `You are a helpful study assistant. 
    Analyze this image (which may be notes, a book page, or a screenshot) and extracting key concepts to create flashcards.
    
    Target Language for Back of card: ${targetLang}.
    Source Language for Front of card: Same as the text in image (or Polish/English).
    
    Output a JSON array of objects with 'front' and 'back' keys. 
    Do not include markdown code blocks (like \`\`\`json), just the raw JSON string.
    
    Example output:
    [
      {"front": "Concept 1", "back": "Explanation 1"},
      {"front": "Word", "back": "Translation"}
    ]
    
    ${prompt || "Generate as many high-quality flashcards as possible from the visible text."}`;

    // Prepare content parts
    // 'file' comes as base64 string from the client
    const imagePart = {
      inlineData: {
        data: file,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    const result = await model.generateContent([fullPrompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("Raw Gemini Response:", text);

    // Clean up potential markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let flashcards = [];
    try {
        flashcards = JSON.parse(cleanedText);
    } catch (e) {
        throw new Error("Failed to parse Gemini response as JSON: " + text.substring(0, 100));
    }

    return new Response(
      JSON.stringify(flashcards),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
