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

// Use gemini-2.0-flash for structured JSON — 2.5 Flash (thinking model) can
// produce empty outputs when responseSchema is used, which triggers the
// "model output must contain either output text or tool calls" API error.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/**
 * Generate typed, structured JSON from Gemini Models API.
 * Uses gemini-2.0-flash by default (non-thinking) to avoid empty output errors.
 * Retries once on empty response before throwing.
 */
export async function generateStructuredJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  responseSchema: Schema;
  maxRetries?: number;
}): Promise<T> {
  if (!isGeminiConfigured) {
    throw new Error(
      "GEMINI_NOT_CONFIGURED // GEMINI_API_KEY is not set in environment variables."
    );
  }

  const model = params.model || GEMINI_MODEL;
  const maxRetries = params.maxRetries ?? 2;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: params.userPrompt,
        config: {
          systemInstruction: params.systemPrompt,
          temperature: params.temperature ?? 0.3,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          // Disable thinking budget — thinking models can return empty output
          // when combined with responseSchema structured output constraints.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const content = response.text;
      if (!content || content.trim().length === 0) {
        throw new Error(
          `EMPTY_AI_RESPONSE // Gemini returned an empty response body on attempt ${attempt}.`
        );
      }

      try {
        return JSON.parse(content) as T;
      } catch (err: any) {
        throw new Error(
          `MALFORMED_JSON_OUTPUT // Failed to parse Gemini JSON output: ${err?.message}`
        );
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.message.includes("EMPTY_AI_RESPONSE") ||
        lastError.message.includes("model output") ||
        lastError.message.includes("500") ||
        lastError.message.includes("503");

      if (!isRetryable || attempt >= maxRetries) {
        throw lastError;
      }
      // Brief back-off before retry
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastError!;
}
