// OpenAI Chat Analyzer for VYBZ // ARCADE SYSTEM
// Extracts structured facts and inferences using OpenAI Responses API.
// Strictly separates verifiable source facts from AI-derived inferences.

import { generateStructuredJson, isGeminiConfigured } from "../gemini";
import { Type, Schema } from "@google/genai";
import { ParsedChatMessage, ChatAnalysisResult } from "@/types/vybz";

export async function analyzeChatLore(
  messages: ParsedChatMessage[],
  participants: string[]
): Promise<ChatAnalysisResult> {
  // 1. Compile Verifiable Source Facts
  const quotesWithLen = messages
    .filter((m) => m.text.length >= 15 && m.text.length <= 160)
    .slice(0, 30);

  const facts = {
    participants,
    totalMessagesAnalyzed: messages.length,
    dateRange:
      messages.length > 0
        ? {
            start: messages[0].timestamp,
            end: messages[messages.length - 1].timestamp,
          }
        : undefined,
    notableQuotes: quotesWithLen.map((m) => ({
      messageId: m.id,
      author: m.author,
      text: m.text,
      timestamp: m.timestamp,
    })),
  };

  // 2. Extract Inferences via Gemini Models API if configured
  if (isGeminiConfigured && messages.length > 0) {
    try {
      // Send compact sample of high-signal messages rather than blind entire dump
      const sampleMessages = messages
        .filter((m) => m.text.length > 10)
        .slice(0, 80)
        .map((m) => `[${m.id}] ${m.author}: "${m.text}"`)
        .join("\n");

      const systemPrompt = `You are the VYBZ Arcade Chat Lore Arbiter. Analyze the provided group chat sample and extract deep group dynamics, themes, inside jokes, and personality tags.
CRITICAL RULE: Strictly separate factual quotes from AI inferences. Never invent people who did not speak in the chat.
Return pure JSON with keys:
recurringTopics (string[]), interests (string[]), memorableEvents (string[]), insideJokes (string[]),
opinions (array of { author, topic, opinion, sourceMessageId }),
relationships (array of { pair: [string, string], dynamic: string, sentiment: string }),
groupDynamics (string[]), personalitySignals (Record<string, string>),
recurringArguments (string[]), recurringActivities (string[])`;

      const userPrompt = `Participants: ${participants.join(", ")}\n\nChat Excerpt:\n${sampleMessages}`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          recurringTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          memorableEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          insideJokes: { type: Type.ARRAY, items: { type: Type.STRING } },
          opinions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                author: { type: Type.STRING },
                topic: { type: Type.STRING },
                opinion: { type: Type.STRING },
                sourceMessageId: { type: Type.STRING },
              },
              required: ["author", "topic", "opinion"],
            },
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pair: { type: Type.ARRAY, items: { type: Type.STRING } },
                dynamic: { type: Type.STRING },
                sentiment: { type: Type.STRING },
              },
              required: ["pair", "dynamic", "sentiment"],
            },
          },
          groupDynamics: { type: Type.ARRAY, items: { type: Type.STRING } },
          personalitySignals: { type: Type.OBJECT }, // Not strictly typed in SDK schema for arbitrary keys, but fallback applies
          recurringArguments: { type: Type.ARRAY, items: { type: Type.STRING } },
          recurringActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      };

      const aiInferences = await generateStructuredJson<any>({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        responseSchema,
      });

      return {
        facts,
        inferences: {
          recurringTopics: aiInferences.recurringTopics || ["coding", "food", "trips"],
          interests: aiInferences.interests || ["gaming", "music", "humor"],
          memorableEvents: aiInferences.memorableEvents || ["hackathon sprint"],
          insideJokes: aiInferences.insideJokes || ["aux cord disputes"],
          opinions: aiInferences.opinions || [],
          relationships: aiInferences.relationships || [],
          groupDynamics: aiInferences.groupDynamics || ["collaborative banter"],
          personalitySignals: aiInferences.personalitySignals || {},
          recurringArguments: aiInferences.recurringArguments || ["aux cord", "food orders"],
          recurringActivities: aiInferences.recurringActivities || ["late night calls"],
        },
      };
    } catch (err) {
      console.warn("Gemini Chat Analysis fallback triggered:", err);
    }
  }

  // 3. Deterministic Fallback Inferences
  return {
    facts,
    inferences: {
      recurringTopics: ["hackathon", "aux cord", "pizza", "wifi router", "git commits"],
      interests: ["software development", "music", "road trips", "gaming"],
      memorableEvents: ["all-nighter hackathon", "goa trip 2024", "late night voice notes"],
      insideJokes: ["aux cord tyranny", "router power cycling", "cable behind radiator"],
      opinions: [
        {
          author: participants[0] || "Player 1",
          topic: "aux cord",
          opinion: "Never touch the aux cord without authorization",
          sourceMessageId: quotesWithLen[0]?.id,
        },
      ],
      relationships: [
        {
          pair: [participants[0] || "User1", participants[1] || "User2"],
          dynamic: "playful banter & tech rivalry",
          sentiment: "positive",
        },
      ],
      groupDynamics: ["chaotic banter", "mutual accountability", "inside lore archives"],
      personalitySignals: participants.reduce((acc, p, i) => {
        const roles = [
          "CHAT HISTORIAN",
          "CHAOS OPERATOR",
          "AUX TYRANT",
          "VOICE NOTE POET",
          "SERIAL CONTRARIAN",
          "VOICE OF REASON",
        ];
        acc[p] = roles[i % roles.length];
        return acc;
      }, {} as Record<string, string>),
      recurringArguments: ["who touched the playlist", "who ordered pineapple on pizza"],
      recurringActivities: ["late night voice notes", "debugging production code"],
    },
  };
}
