// Server-Side Gemini AI Service Client for VYBZ // ARCADE SYSTEM
// NEVER import this file from client components.

import { GoogleGenAI, Type, Schema } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";

export const isGeminiConfigured = Boolean(
  apiKey &&
    apiKey.trim().length > 0 &&
    !apiKey.includes("placeholder") &&
    !apiKey.includes("your-api-key")
);

export const gemini = new GoogleGenAI({
  apiKey: apiKey || "dummy-key-for-build",
});

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Generate typed, structured JSON from Gemini Models API
 */
export async function generateStructuredJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  responseSchema: Schema;
}): Promise<T> {
  if (!isGeminiConfigured) {
    throw new Error(
      "GEMINI_NOT_CONFIGURED // GEMINI_API_KEY is not set in environment variables."
    );
  }

  const response = await gemini.models.generateContent({
    model: params.model || GEMINI_MODEL,
    contents: params.userPrompt,
    config: {
      systemInstruction: params.systemPrompt,
      temperature: params.temperature ?? 0.3,
      responseMimeType: "application/json",
      responseSchema: params.responseSchema,
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error("EMPTY_AI_RESPONSE // Gemini returned an empty response body.");
  }

  try {
    return JSON.parse(content) as T;
  } catch (err: any) {
    throw new Error(`MALFORMED_JSON_OUTPUT // Failed to parse Gemini JSON output: ${err?.message}`);
  }
}
