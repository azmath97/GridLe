
import { GoogleGenAI, Type } from "@google/genai";
import { Race } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const RACE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    year: { type: Type.INTEGER },
    gpName: { type: Type.STRING },
    winner: { type: Type.STRING },
    country: { type: Type.STRING },
    clues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["text", "category"]
      }
    },
    summary: { type: Type.STRING },
    facts: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["year", "gpName", "winner", "country", "clues", "summary", "facts"]
};

export async function generateRace(targetYear?: number): Promise<Race> {
  const prompt = `Generate a Formula 1 race dossier for a specific GP between 2000 and 2026.
  ${targetYear ? `Focus on the year ${targetYear}.` : 'Select a random significant race.'}
  
  CRITICAL RULES:
  1. The GP name, country, circuit name, city, or direct geographical markers MUST NOT appear in any of the 6 clues.
  2. Exactly 6 clues ordered from Cryptic (1) to Very Revealing (6).
  3. Diversity Rule: At least 3 of 6 clues must be NON-race-lap facts (e.g., driver interviews, steward decisions, championship math, practice anomalies, off-track incidents).
  4. Accuracy: Ensure every detail is factually correct.
  5. Provide the 'winner' and 'country' separately for the hint system.
  6. Forbidden in clues: Direct mentions of tracks like 'Silverstone', 'Monza', 'Spa', or countries like 'Japan'. Use descriptors if needed.
  7. Facts: Include 3-5 interesting verified facts for the end-game screen.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: RACE_SCHEMA,
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as Race;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Could not generate race data");
  }
}
