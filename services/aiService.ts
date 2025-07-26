
import { GoogleGenAI, Type } from "@google/genai";
import { logFirebaseError } from '../firebase/logging.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBlogSuggestions = async (
  task: 'title' | 'excerpt', 
  content: string
): Promise<{ suggestions: string[] }> => {
  const prompt = task === 'title' 
    ? `Based on the following article content in Thai, generate 3 creative and engaging blog post titles in Thai. The content may be HTML. Content: ${content.substring(0, 2000)}`
    : `Based on the following article content in Thai, generate a concise and compelling excerpt of about 1-2 sentences in Thai. The content may be HTML. Content: ${content.substring(0, 2000)}`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        }
      }
    }
  };
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    const parsed = JSON.parse(jsonText);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error("AI response did not contain a 'suggestions' array.");
    }

    return parsed;
  } catch (error) {
    logFirebaseError('generateBlogSuggestions', error);
    throw new Error('Failed to generate AI suggestions.');
  }
};
