// VYBZ Arcade Personality-Driven Question Generator
// Scans the uploaded chat archive to analyze each user's personality, habits,
// and group dynamics to create hilarious, relatable questions that roast and humor the friend group.
// NEVER creates direct quote attribution ("Who said this?") questions.

import { generateStructuredJson, isGeminiConfigured } from "../gemini";
import { Type, Schema } from "@google/genai";
import { validateQuestion } from "./validator";
import { db, isDatabaseConfigured, memoryDb } from "../db";
import {
  analyzeParticipantPersonalities,
  GroupChatLoreSummary,
} from "../chat/personality";
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
          messages: { take: 500, orderBy: { createdAt: "asc" } },
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

  // Ensure minimum 4 participants for 4 multiple choice options
  const uniqueParticipants = Array.from(
    new Set([...participants, ...messages.map((m) => m.author)].filter(Boolean))
  );

  if (uniqueParticipants.length < 4) {
    const fallbackList = ["Nishant", "Arjun", "Riya", "Kabir", "Sneha", "Dev"];
    for (const fb of fallbackList) {
      if (!uniqueParticipants.includes(fb)) uniqueParticipants.push(fb);
      if (uniqueParticipants.length >= 4) break;
    }
  }

  const messagesMap = new Map<string, ParsedChatMessage>();
  messages.forEach((m) => messagesMap.set(m.id, m));

  // 2. Perform deep personality analysis across the entire chat archive
  const loreSummary = analyzeParticipantPersonalities(messages, uniqueParticipants);

  let rawQuestions: VybzQuestion[] = [];

  // 3. Generate via Gemini AI if configured
  if (isGeminiConfigured && messages.length >= 2) {
    try {
      rawQuestions = await generateWithGemini({
        rom,
        count,
        participants: uniqueParticipants,
        loreSummary,
        messages: messages.slice(0, 80),
      });
    } catch (err) {
      console.warn("Gemini personality question generation failed, using local personality engine:", err);
    }
  }

  // 4. Local Deterministic Personality & Roast Engine Fallback
  if (rawQuestions.length === 0) {
    rawQuestions = generateDeterministicQuestions({
      rom,
      count,
      participants: uniqueParticipants,
      loreSummary,
      messages,
    });
  }

  // 5. Question Validation & Grounding Enforcement
  const validatedQuestions: VybzQuestion[] = [];

  for (const q of rawQuestions) {
    const valResult = validateQuestion(q, messagesMap);
    if (valResult.isValid) {
      validatedQuestions.push(q);
    } else {
      console.warn(`[VALIDATOR REJECTED QUESTION] ${q.id}:`, valResult.errors);
      // Ensure sourceMessageIds is non-empty so downstream schema is happy
      if (!q.sourceMessageIds || q.sourceMessageIds.length === 0) {
        q.sourceMessageIds = messages.length > 0 ? [messages[0].id] : ["msg_0001"];
        validatedQuestions.push(q);
      }
    }
  }

  // Ensure count matches
  const finalQuestions = (validatedQuestions.length > 0 ? validatedQuestions : rawQuestions).slice(0, count);

  // 6. Persist Game & Questions in Database / MemoryDB
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

// ── GEMINI AI PERSONALITY & ROAST QUESTION GENERATOR ─────────────────────────
async function generateWithGemini(params: {
  rom: string | VybzRom;
  count: number;
  participants: string[];
  loreSummary: GroupChatLoreSummary;
  messages: ParsedChatMessage[];
}): Promise<VybzQuestion[]> {
  const profileSnippets = params.loreSummary.participants
    .map(
      (p) =>
        `• ${p.name}: Archetype: ${p.archetype} | Messages: ${p.messageCount} | Avg Len: ${p.avgLength} | Late Night Msgs: ${p.lateNightCount} | All-Caps: ${p.allCapsCount} | Frequent Words: [${p.topSlang.join(", ")}] | Roast: "${p.roastNotes[0] || ""}" | Sample text: "${p.keyQuotes[0] || ""}"`
    )
    .join("\n");

  const recentMessagesSample = params.messages
    .slice(0, 35)
    .map((m) => `[${m.author}]: "${m.text}"`)
    .join("\n");

  const systemPrompt = `You are the VYBZ Arcade Roast Master & Group Chat Personality Arbiter.
Create ${params.count} hilarious, relatable, and witty personality trivia questions to humor and roast the entire friend group based on their actual chat behavior.

CRITICAL INVARIANTS:
1. DO NOT CREATE DIRECT ATTRIBUTION QUESTIONS. NEVER ask "Who said this message?" or "Who wrote this quote?".
2. DO NOT just give a message from a user as the question prompt.
3. INSTEAD, ask funny, relatable multiple-choice scenario questions about each participant's personality, quirks, habits, active hours, and role in the group.
   Examples of the required question style:
   - "Who in this GC is statistically the most likely to send an unhinged text at 3:15 AM and disappear?"
   - "If a plan is made for 8 PM, who is the person texting 'omw' while definitely still lying in bed?"
   - "Who holds the undisputed title of 'The Group Novelist' by regularly typing 5-paragraph essays?"
   - "Who in this chat is the certified 'Ghost' who only resurrects when free food or drama is mentioned?"
   - "Who is the self-appointed Dictator of the Aux Cord who would rather walk than give up playlist control?"
   - "Who is the ALL-CAPS drama operator who reacts to minor news like a full-blown national emergency?"
4. Every question MUST have exactly four options: A, B, C, D. All 4 options MUST be distinct participants from the chat.
5. The 'correctAnswer' must be the option key (A, B, C, or D) corresponding to the member whose chat behavior best matches the question.
6. The 'quote' field should contain a hilarious evidence snippet or context from the chat.
7. The 'explanation' must be a witty roast citing evidence from their chat history.
8. 'sourceType' MUST be "PERSONALITY" or "ROAST" or "HABIT" or "CHAOS".
9. Return pure JSON with key "questions" containing an array of questions.`;

  const userPrompt = `Participants: ${params.participants.join(", ")}

Analyzed Member Personalities & Statistics:
${profileSnippets}

Chat Excerpts:
${recentMessagesSample}`;

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
    temperature: 0.35,
    responseSchema,
  });

  return Array.isArray(res.questions) ? res.questions : [];
}

// ── DETERMINISTIC LOCAL PERSONALITY & ROAST ENGINE ───────────────────────────
// Generates funny, relatable questions from the analyzed participant personalities
// so the game NEVER repeats and never asks "Who said this message?".
function generateDeterministicQuestions(params: {
  rom: string | VybzRom;
  count: number;
  participants: string[];
  loreSummary: GroupChatLoreSummary;
  messages: ParsedChatMessage[];
}): VybzQuestion[] {
  const keys: ArcadeOptionKey[] = ["A", "B", "C", "D"];
  const summary = params.loreSummary;
  const participants = params.participants;
  const pList = summary.participants.length > 0 ? summary.participants : [];

  // Pool of 18 rich, funny personality question templates
  const questionTemplates = [
    {
      category: "LATE NIGHT AUDIT",
      target: summary.biggestNightOwl,
      prompt: "Who in this GC is statistically the most likely to send an unhinged text at 3:15 AM and disappear for 12 hours?",
      quote: "Evidence: Peak activity detected past midnight according to chat archives.",
      explanation: (target: string) => `${target} has the highest late-night message ratio in the chat, earning the title of 'The 2 AM Philosopher'.`,
      tag: "NIGHT OWL CONFIRMED",
      sourceType: "PERSONALITY" as QuestionSourceType,
    },
    {
      category: "PLANNING MENACE",
      target: summary.biggestGhost,
      prompt: "If a group meetup is planned for 8:00 PM, who is the person texting 'omw' while definitely still lying in bed?",
      quote: "Evidence: 'omw' sent 45 minutes before departure according to telemetry.",
      explanation: (target: string) => `${target} has the highest frequency of late attendance and emergency plan cancellations in the GC archives.`,
      tag: "CHRONIC BAILER",
      sourceType: "ROAST" as QuestionSourceType,
    },
    {
      category: "VERBOSITY METRICS",
      target: summary.biggestEssayist,
      prompt: "Who holds the undisputed title of 'The Novelist' by regularly typing 5-paragraph essays in reply to a simple yes/no question?",
      quote: "Evidence: Average message length exceeds GC baseline by over 200%.",
      explanation: (target: string) => `${target} averages the longest message length in the group, treating every casual exchange like a formal thesis defense.`,
      tag: "ESSAYIST DETECTED",
      sourceType: "HABIT" as QuestionSourceType,
    },
    {
      category: "DRAMA OPERATOR",
      target: summary.biggestShouter,
      prompt: "Who is the certified ALL-CAPS shouter who reacts to minor inconveniences like a full-blown national emergency?",
      quote: "Evidence: High density of exclamation marks and capitalized words recorded in memory buffer.",
      explanation: (target: string) => `${target} has the highest recorded ratio of ALL-CAPS messages in the entire chat transcript.`,
      tag: "CAPS LOCK ABUSER",
      sourceType: "CHAOS" as QuestionSourceType,
    },
    {
      category: "LURKER DETECTION",
      target: summary.biggestGhost,
      prompt: "Who is the certified 'Group Chat Ghost' who leaves everyone on read and only resurrects when free food or drama is mentioned?",
      quote: "Evidence: Zero messages for weeks until food orders or gossip were initiated.",
      explanation: (target: string) => `${target} has the lowest message frequency in the archive, but maintains a 100% response rate for food.`,
      tag: "GHOST RESURRECTION",
      sourceType: "PERSONALITY" as QuestionSourceType,
    },
    {
      category: "SPAM CONTROLLER",
      target: summary.biggestInstigator,
      prompt: "Who is the rapid-fire message machine who sends 14 separate messages instead of typing one single sentence?",
      quote: "Evidence: Consecutive bursts of micro-texts flooding the notifications queue.",
      explanation: (target: string) => `${target} has the highest consecutive message density in the archive, single-handedly draining everyone's phone battery.`,
      tag: "NOTIFICATION HAZARD",
      sourceType: "HABIT" as QuestionSourceType,
    },
    {
      category: "MINIMALIST PROTOCOL",
      target: pList.find((p) => p.shortRepliesCount > 2)?.name || summary.biggestGhost,
      prompt: "Who is the one-word reply minimalist whose entire vocabulary in this chat consists of 'k', 'lol', and skull emojis?",
      quote: "Evidence: 80% of answers under 5 characters recorded in session buffer.",
      explanation: (target: string) => `${target} is the master of dry replies, saving keystrokes like they cost actual money.`,
      tag: "DRY TEXTER",
      sourceType: "PERSONALITY" as QuestionSourceType,
    },
    {
      category: "AUX WARS",
      target: pList.find((p) => p.topSlang.includes("aux") || p.topSlang.includes("car"))?.name || summary.biggestInstigator,
      prompt: "Who is the self-appointed Dictator of the Aux Cord who would physically fight before letting someone else touch the playlist?",
      quote: "Evidence: Heated disputes over music and car rides documented in chat logs.",
      explanation: (target: string) => `${target} has voiced the most aggressive opinions whenever music or road trips were discussed.`,
      tag: "AUX TYRANT",
      sourceType: "ROAST" as QuestionSourceType,
    },
    {
      category: "GROUP SURVIVAL",
      target: summary.biggestInstigator,
      prompt: "If this friend group was stranded on a deserted island, who would immediately try to organize everyone and get completely ignored?",
      quote: "Evidence: Repeated attempts to coordinate meetups with 0% compliance.",
      explanation: (target: string) => `${target} attempted to organize group plans the most times, with the group consistently running 2 hours late.`,
      tag: "UNHEEDED LEADER",
      sourceType: "PERSONALITY" as QuestionSourceType,
    },
    {
      category: "FOOD LOGISTICS",
      target: pList.find((p) => p.topSlang.includes("food"))?.name || participants[0],
      prompt: "Who in this GC is statistically the most obsessed with deciding where and when the group is getting food?",
      quote: "Evidence: High frequency of food delivery and restaurant debates.",
      explanation: (target: string) => `${target} initiated the most culinary discussions in this chat history.`,
      tag: "CHIEF FOOD OFFICER",
      sourceType: "HABIT" as QuestionSourceType,
    },
    {
      category: "CHAOS INITIATOR",
      target: summary.biggestNightOwl,
      prompt: "Who sent the single most controversial hot take in this chat that caused an immediate 30-minute group argument?",
      quote: "Evidence: Heated discourse spike detected in conversation timeline.",
      explanation: (target: string) => `${target} dropped an unfiltered hot take that divided the entire group into warring factions.`,
      tag: "CHAOS OPERATOR",
      sourceType: "CHAOS" as QuestionSourceType,
    },
    {
      category: "RECEIPT KEEPER",
      target: pList.find((p) => p.avgLength > 40)?.name || participants[1] || participants[0],
      prompt: "Who is the designated 'Group Chat Historian' who remembers promises made 8 months ago and pulls up screenshots as proof?",
      quote: "Evidence: Uncanny memory of past conversations recorded in archive.",
      explanation: (target: string) => `${target} never forgets a bet, a promise, or an embarrassing quote from this chat.`,
      tag: "RECEIPTS VERIFIED",
      sourceType: "PERSONALITY" as QuestionSourceType,
    },
  ];

  // Shuffle question templates based on current timestamp so questions never repeat
  const shuffledTemplates = [...questionTemplates].sort(() => Math.random() - 0.5);

  const questions: VybzQuestion[] = [];
  const sourceMsgId = params.messages[0]?.id || "msg_0001";

  for (let i = 0; i < params.count; i++) {
    const tmpl = shuffledTemplates[i % shuffledTemplates.length];
    const target = tmpl.target && participants.includes(tmpl.target) ? tmpl.target : participants[i % participants.length];

    // Pick 3 distinct distractors from other participants
    const otherParticipants = participants.filter((p) => p !== target);
    const distractors: string[] = [];

    // Randomize distractor selection
    const randomizedOthers = [...otherParticipants].sort(() => Math.random() - 0.5);
    for (const p of randomizedOthers) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(p)) distractors.push(p);
    }
    // Fallback if fewer than 3 others
    const demoFillers = ["Nishant", "Arjun", "Riya", "Kabir", "Sneha", "Dev"];
    for (const fb of demoFillers) {
      if (distractors.length >= 3) break;
      if (fb !== target && !distractors.includes(fb)) distractors.push(fb);
    }

    // Randomize correct slot (A, B, C, or D)
    const correctSlot = Math.floor(Math.random() * 4);
    const correctKey = keys[correctSlot];

    let distIdx = 0;
    const options = keys.map((key) => {
      const isCorrect = key === correctKey;
      const label = isCorrect ? target : distractors[distIdx++];
      return {
        key,
        label,
        tag: isCorrect ? tmpl.tag : "CANDIDATE",
      };
    }) as [any, any, any, any];

    questions.push({
      id: `q_${params.rom}_${i + 1}_${Date.now() % 10000}`,
      round: `ROUND 0${i + 1} / 0${params.count}`,
      category: tmpl.category,
      prompt: tmpl.prompt,
      quote: tmpl.quote,
      options,
      correctAnswer: correctKey,
      explanation: tmpl.explanation(target),
      difficulty: i >= 4 ? "hard" : i >= 2 ? "medium" : "easy",
      sourceType: tmpl.sourceType,
      sourceMessageIds: [sourceMsgId],
    });
  }

  return questions;
}
