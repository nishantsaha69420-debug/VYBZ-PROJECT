// 5 VYBZ ROM Generator with Strict Source Grounding & Validation
// Generates questions using OpenAI Responses API and enforces critical invariants.

import { generateStructuredJson, isGeminiConfigured } from "../gemini";
import { Type, Schema } from "@google/genai";
import { validateQuestion } from "./validator";
import { db, isDatabaseConfigured, memoryDb } from "../db";
import {
  VybzQuestion,
  VybzRom,
  ParsedChatMessage,
  ArcadeOptionKey,
  QuestionSourceType,
} from "@/types/vybz";

export interface GenerateGameParams {
  sessionId: string;
  rom: string | VybzRom;
  questionCount?: number;
  userId?: string;
}

export interface GenerateGameResult {
  gameId: string;
  rom: string;
  questions: VybzQuestion[];
}

export async function generateGameQuestions(
  params: GenerateGameParams
): Promise<GenerateGameResult> {
  const count = Math.min(30, Math.max(1, Number(params.questionCount) || 5));
  const rom = params.rom || "ROM_001";

  // 1. Fetch Session & Messages from DB or memoryDb
  let messages: ParsedChatMessage[] = [];
  let participants: string[] = [];

  if (isDatabaseConfigured) {
    try {
      const session = await db.chatSession.findUnique({
        where: { id: params.sessionId },
        include: {
          messages: { take: 300, orderBy: { createdAt: "asc" } },
          participants: true,
        },
      });

      if (session) {
        messages = session.messages.map((m) => ({
          id: m.id,
          author: m.author,
          text: m.text,
          timestamp: m.timestamp,
        }));
        participants = session.participants.map((p) => p.name);
      }
    } catch (err) {
      console.warn("DB Session lookup failed, using in-memory store:", err);
    }
  }

  if (messages.length === 0) {
    const memSession = memoryDb.chatSessions.get(params.sessionId);
    if (memSession) {
      messages = memSession.messages || [];
      participants = memSession.participants || [];
    }
  }

  // Ensure minimum 4 participants
  const uniqueParticipants = Array.from(new Set(participants.filter(Boolean)));
  if (uniqueParticipants.length < 4) {
    // Add known demo participants if fewer than 4 to avoid synthetic non-chat names
    const fallbackList = ["Nishant", "Arjun", "Riya", "Kabir", "Sneha", "Dev"];
    for (const fb of fallbackList) {
      if (!uniqueParticipants.includes(fb)) uniqueParticipants.push(fb);
      if (uniqueParticipants.length >= 4) break;
    }
  }

  const messagesMap = new Map<string, ParsedChatMessage>();
  messages.forEach((m) => messagesMap.set(m.id, m));

  // Eligible quote pool (length between 15 and 150 chars)
  const eligibleMessages = messages.filter(
    (m) => m.text.length >= 15 && m.text.length <= 150
  );

  let rawQuestions: VybzQuestion[] = [];

  // 2. Generate via Gemini Models API if configured
  if (isGeminiConfigured && eligibleMessages.length >= 4) {
    try {
      rawQuestions = await generateWithGemini({
        rom,
        count,
        participants: uniqueParticipants,
        eligibleMessages: eligibleMessages.slice(0, 60),
      });
    } catch (err) {
      console.warn("Gemini question generation failed, using deterministic grounded fallback:", err);
    }
  }

  // 3. Deterministic Grounded Generation Fallback
  if (rawQuestions.length === 0) {
    rawQuestions = generateDeterministicQuestions({
      rom,
      count,
      participants: uniqueParticipants,
      eligibleMessages: eligibleMessages.length >= 4 ? eligibleMessages : messages,
    });
  }

  // 4. Critical Question Validation & Grounding Enforcement
  const validatedQuestions: VybzQuestion[] = [];

  for (const q of rawQuestions) {
    const valResult = validateQuestion(q, messagesMap);
    if (valResult.isValid) {
      validatedQuestions.push(q);
    } else {
      console.warn(`[VALIDATOR REJECTED QUESTION] ${q.id}:`, valResult.errors);
      // Attempt immediate repair for WHO_SAID_IT invariant
      if (q.sourceType === "WHO_SAID_IT" && q.sourceMessageIds.length > 0) {
        const srcMsg = messagesMap.get(q.sourceMessageIds[0]);
        if (srcMsg) {
          const repaired = repairWhoSaidItQuestion(q, srcMsg, uniqueParticipants);
          const recheck = validateQuestion(repaired, messagesMap);
          if (recheck.isValid) {
            validatedQuestions.push(repaired);
          }
        }
      }
    }
  }

  // Ensure count matches
  const finalQuestions = validatedQuestions.slice(0, count);

  // 5. Persist Game & Questions in Database
  const gameId = `game_${Math.random().toString(36).substring(2, 11)}`;

  if (isDatabaseConfigured) {
    try {
      await db.game.create({
        data: {
          id: gameId,
          sessionId: params.sessionId,
          rom: String(rom),
          status: "READY",
          questionCount: finalQuestions.length,
          currentQuestion: 0,
          questions: {
            create: finalQuestions.map((q, idx) => ({
              id: q.id,
              questionIndex: idx,
              category: q.category,
              prompt: q.prompt,
              quote: q.quote,
              optionsJson: q.options as any,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty,
              sourceType: q.sourceType,
              sourceMessageIds: q.sourceMessageIds,
            })),
          },
        },
      });
    } catch (err) {
      console.warn("Failed to persist Game to DB:", err);
    }
  }

  memoryDb.games.set(gameId, {
    id: gameId,
    sessionId: params.sessionId,
    rom: String(rom),
    status: "READY",
    questionCount: finalQuestions.length,
    currentQuestion: 0,
    questions: finalQuestions,
  });

  return {
    gameId,
    rom: String(rom),
    questions: finalQuestions,
  };
}

// ── GEMINI GENERATION IMPLEMENTATION ─────────────────────────────────────────
async function generateWithGemini(params: {
  rom: string | VybzRom;
  count: number;
  participants: string[];
  eligibleMessages: ParsedChatMessage[];
}): Promise<VybzQuestion[]> {
  const sampleText = params.eligibleMessages
    .map((m) => `ID: ${m.id} | Author: ${m.author} | Quote: "${m.text}"`)
    .join("\n");

  const systemPrompt = `You are the VYBZ Arcade ROM Question Compiler. Generate ${params.count} questions for ${params.rom}.
STRICT GROUNDING INVARIANTS:
1. Every question MUST reference real message IDs from the provided chat excerpt in sourceMessageIds.
2. For WHO_SAID_IT: The correct option's label MUST EXACTLY match the source message author.
3. Every question MUST have exactly four options: A, B, C, D. All 4 options must be distinct participants from the chat.
4. quote must match the text of the source message.
5. Return JSON with key "questions" containing an array of questions.`;

  const userPrompt = `Participants: ${params.participants.join(", ")}\n\nAvailable Real Chat Messages:\n${sampleText}`;

  const questionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      round: { type: Type.STRING },
      category: { type: Type.STRING },
      prompt: { type: Type.STRING },
      quote: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING },
            label: { type: Type.STRING },
            tag: { type: Type.STRING },
          },
          required: ["key", "label", "tag"],
        },
      },
      correctAnswer: { type: Type.STRING },
      explanation: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      sourceType: { type: Type.STRING },
      sourceMessageIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      "id",
      "round",
      "category",
      "prompt",
      "quote",
      "options",
      "correctAnswer",
      "explanation",
      "difficulty",
      "sourceType",
      "sourceMessageIds",
    ],
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: questionSchema,
      },
    },
    required: ["questions"],
  };

  const res = await generateStructuredJson<{ questions: VybzQuestion[] }>({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    responseSchema,
  });

  return Array.isArray(res.questions) ? res.questions : [];
}

// ── DETERMINISTIC GROUNDED QUESTION GENERATOR ─────────────────────────────────
function generateDeterministicQuestions(params: {
  rom: string | VybzRom;
  count: number;
  participants: string[];
  eligibleMessages: ParsedChatMessage[];
}): VybzQuestion[] {
  const questions: VybzQuestion[] = [];
  const keys: ArcadeOptionKey[] = ["A", "B", "C", "D"];
  const msgList = params.eligibleMessages.length > 0
    ? params.eligibleMessages
    : [
        { id: "msg_0001", author: params.participants[0], text: "guys are we actually doing this tonight", timestamp: "18:05" },
        { id: "msg_0002", author: params.participants[1], text: "you said that last night too", timestamp: "18:11" },
        { id: "msg_0003", author: params.participants[2], text: "last night we were supposed to plan", timestamp: "18:14" },
        { id: "msg_0004", author: params.participants[3], text: "and somehow we argued for 3 hours", timestamp: "18:17" },
      ];

  const sourceType: QuestionSourceType =
    params.rom.includes("002") ? "MEMORY"
    : params.rom.includes("003") ? "RELATIONSHIP"
    : params.rom.includes("004") ? "OPINION"
    : params.rom.includes("005") ? "CHAOS"
    : "WHO_SAID_IT";

  for (let i = 0; i < params.count; i++) {
    const srcMsg = msgList[i % msgList.length];
    const author = srcMsg.author;

    // Pick 3 distinct distractors from participants
    const otherParticipants = params.participants.filter((p) => p !== author);
    const distractors: string[] = [];

    for (let d = 0; d < 3; d++) {
      const pick = otherParticipants[(i * 2 + d) % otherParticipants.length];
      if (!distractors.includes(pick)) distractors.push(pick);
    }
    for (const p of otherParticipants) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(p)) distractors.push(p);
    }

    // Determine correct key slot (e.g. i=0 -> B, i=1 -> A, i=2 -> D, i=3 -> C)
    const correctSlot = (i * 3 + 1) % 4;
    const correctKey = keys[correctSlot];

    let distractorIndex = 0;
    const options = keys.map((key) => {
      const isCorrect = key === correctKey;
      const label = isCorrect ? author : distractors[distractorIndex++];
      return {
        key,
        label,
        tag: isCorrect ? "SOURCE VERIFIED" : "CANDIDATE",
      };
    }) as [any, any, any, any];

    questions.push({
      id: `q_${params.rom}_${i + 1}`,
      round: `ROUND 0${i + 1} / 0${params.count}`,
      category:
        params.rom.includes("002") ? "MEMORY BANK"
        : params.rom.includes("003") ? "FRIENDSHIP QUIZ"
        : params.rom.includes("004") ? "HOT TAKE MACHINE"
        : params.rom.includes("005") ? "CHAOS MODE"
        : "WHO SAID IT?",
      prompt:
        params.rom.includes("002") ? "WHICH PARTICIPANT RECORDED THIS IN MEMORY?"
        : params.rom.includes("003") ? "WHO WAS THE INITIATOR OF THIS CONVERSATION?"
        : params.rom.includes("004") ? "WHO EXPRESSED THIS CONTROVERSIAL TAKE?"
        : params.rom.includes("005") ? "CHAOS IDENTIFICATION // WHO DROPPED THIS?"
        : "WHO SAID THIS IN THE GROUP CHAT?",
      quote: srcMsg.text,
      options,
      correctAnswer: correctKey,
      explanation: `${author} posted this verbatim at ${srcMsg.timestamp}.`,
      difficulty: "medium",
      sourceType,
      sourceMessageIds: [srcMsg.id],
    });
  }

  return questions;
}

// ── REPAIR HELPER FOR WHO_SAID_IT ─────────────────────────────────────────────
function repairWhoSaidItQuestion(
  q: VybzQuestion,
  srcMsg: ParsedChatMessage,
  participants: string[]
): VybzQuestion {
  const keys: ArcadeOptionKey[] = ["A", "B", "C", "D"];
  const author = srcMsg.author;
  const otherParticipants = participants.filter((p) => p !== author);

  const correctKey = q.correctAnswer || "A";
  let distIdx = 0;

  const repairedOptions = keys.map((k) => {
    if (k === correctKey) {
      return { key: k, label: author, tag: "SOURCE VERIFIED" };
    }
    const distractor = otherParticipants[distIdx++ % otherParticipants.length] || "Member";
    return { key: k, label: distractor, tag: "CANDIDATE" };
  }) as [any, any, any, any];

  return {
    ...q,
    quote: srcMsg.text,
    options: repairedOptions,
    correctAnswer: correctKey,
    explanation: `${author} sent this quote in the group chat.`,
    sourceMessageIds: [srcMsg.id],
  };
}
