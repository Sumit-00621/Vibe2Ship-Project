import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.warn("GEMINI_API_KEY not set — AI features will return mock responses");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateContent(prompt: string): Promise<string> {
  if (!ai) {
    return JSON.stringify({ error: "No API key configured" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
    });
    return response.text ?? "{}";
  } catch (err) {
    logger.error({ err }, "Gemini API error");
    throw err;
  }
}
