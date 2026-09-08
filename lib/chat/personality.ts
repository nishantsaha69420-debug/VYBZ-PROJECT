// Detailed Participant Personality & Group Dynamic Analyzer for VYBZ
// Scans the full chat log to extract individual participant behaviors,
// quirks, late-night habits, vocabulary, and comedic group archetypes.

import { ParsedChatMessage } from "@/types/vybz";

export interface ParticipantPersonality {
  name: string;
  messageCount: number;
  avgLength: number;
  lateNightCount: number; // 11 PM - 5 AM
  lateNightRatio: number;
  allCapsCount: number; // Shouting / drama messages
  allCapsRatio: number;
  questionCount: number; // Always asking things
  shortRepliesCount: number; // "k", "ok", "cool", "lmao", "💀"
  topSlang: string[];
  archetype: string;
  title: string;
  roastNotes: string[];
  keyQuotes: string[];
}

export interface GroupChatLoreSummary {
  participants: ParticipantPersonality[];
  topTopics: string[];
  recurringInsideJokes: string[];
  biggestNightOwl: string;
  biggestGhost: string;
  biggestEssayist: string;
  biggestShouter: string;
  biggestInstigator: string;
  totalMessages: number;
}

const COMMON_SLANG_WORDS = [
  "lmao", "lol", "bruh", "bro", "dead", "skull", "omw", "literally",
  "fr", "ong", "cap", "bet", "nah", "wait", "why", "dude", "food",
  "plan", "late", "sleep", "cant", "tired", "meeting", "code", "aux",
  "car", "drive", "trip", "money", "game", "wifi", "call", "pull up"
];

const ARCHETYPES = [
  {
    title: "THE 2 AM PHILOSOPHER",
    check: (p: ParticipantPersonality) => p.lateNightRatio > 0.35,
    roast: "Sends unhinged paragraph-long theories when the entire group is asleep",
  },
  {
    title: "THE NOVELIST // ESSAY WRITER",
    check: (p: ParticipantPersonality) => p.avgLength > 65,
    roast: "Treats casual texts like a master's dissertation defense",
  },
  {
    title: "THE ONE-WORD MINIMALIST",
    check: (p: ParticipantPersonality) => p.avgLength < 18 && p.shortRepliesCount > 3,
    roast: "Answers life-changing questions with 'k', 'lol', or a skull emoji",
  },
  {
    title: "THE ALL-CAPS DRAMA OPERATOR",
    check: (p: ParticipantPersonality) => p.allCapsRatio > 0.2,
    roast: "Permanently typing with Caps Lock glued on for maximum crisis effect",
  },
  {
    title: "THE CHRONIC PLAN BAILER",
    check: (p: ParticipantPersonality) => p.topSlang.includes("omw") || p.topSlang.includes("cant") || p.topSlang.includes("tired"),
    roast: "Texts 'omw' while still tucked comfortably under their blanket",
  },
  {
    title: "THE GROUP CHAT GHOST",
    check: (p: ParticipantPersonality, all: ParticipantPersonality[]) => {
      const avgMsgs = all.reduce((acc, x) => acc + x.messageCount, 0) / (all.length || 1);
      return p.messageCount < avgMsgs * 0.45;
    },
    roast: "Only appears once every 3 weeks when food or juicy drama is mentioned",
  },
  {
    title: "THE RAPID-FIRE SPAMMER",
    check: (p: ParticipantPersonality, all: ParticipantPersonality[]) => {
      const avgMsgs = all.reduce((acc, x) => acc + x.messageCount, 0) / (all.length || 1);
      return p.messageCount > avgMsgs * 1.6;
    },
    roast: "Sends 17 separate one-line messages instead of pressing Enter once",
  },
  {
    title: "THE AUX CORD DICTATOR",
    check: (p: ParticipantPersonality) => p.topSlang.includes("aux") || p.topSlang.includes("music") || p.topSlang.includes("car"),
    roast: "Would physically fight someone before letting them touch the playlist",
  },
  {
    title: "THE VOICE OF CHAOS",
    check: () => true, // Fallback
    roast: "Spams controversial hot takes and immediately closes the app",
  },
];

export function analyzeParticipantPersonalities(
  messages: ParsedChatMessage[],
  participants: string[]
): GroupChatLoreSummary {
  // Ensure we have author names even if participants array is incomplete
  const detectedAuthors = Array.from(
    new Set([...participants, ...messages.map((m) => m.author)])
  ).filter(Boolean);

  const profiles: ParticipantPersonality[] = detectedAuthors.map((author) => {
    const authorMsgs = messages.filter(
      (m) => m.author.toLowerCase() === author.toLowerCase()
    );
    const count = authorMsgs.length;

    let totalChars = 0;
    let lateNightCount = 0;
    let allCapsCount = 0;
    let questionCount = 0;
    let shortRepliesCount = 0;
    const wordCounts: Record<string, number> = {};

    const keyQuotes: string[] = [];

    for (const msg of authorMsgs) {
      const text = msg.text.trim();
      totalChars += text.length;

      // Check time (if timestamp contains hour info)
      const timeMatch = msg.timestamp.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const ampm = timeMatch[3]?.toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        if (hour >= 23 || hour <= 5) {
          lateNightCount++;
        }
      }

      // Check uppercase
      const letters = text.replace(/[^a-zA-Z]/g, "");
      if (letters.length >= 8 && letters === letters.toUpperCase()) {
        allCapsCount++;
      }

      // Questions
      if (text.includes("?")) {
        questionCount++;
      }

      // Short replies
      if (text.length <= 6) {
        shortRepliesCount++;
      }

      // Collect key quotes
      if (text.length >= 20 && text.length <= 120 && keyQuotes.length < 5) {
        keyQuotes.push(text);
      }

      // Word extraction
      const cleanWords = text.toLowerCase().split(/\s+/);
      for (const w of cleanWords) {
        const clean = w.replace(/[^a-z0-9]/g, "");
        if (COMMON_SLANG_WORDS.includes(clean)) {
          wordCounts[clean] = (wordCounts[clean] || 0) + 1;
        }
      }
    }

    const avgLength = count > 0 ? Math.round(totalChars / count) : 0;
    const lateNightRatio = count > 0 ? lateNightCount / count : 0;
    const allCapsRatio = count > 0 ? allCapsCount / count : 0;

    const topSlang = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([w]) => w);

    return {
      name: author,
      messageCount: count,
      avgLength,
      lateNightCount,
      lateNightRatio,
      allCapsCount,
      allCapsRatio,
      questionCount,
      shortRepliesCount,
      topSlang,
      archetype: "THE CHAOS OPERATOR",
      title: "MEMBER",
      roastNotes: [],
      keyQuotes: keyQuotes.length > 0 ? keyQuotes : [authorMsgs[0]?.text || "Certified lore contributor"],
    };
  });

  // Assign archetypes and roasts
  for (const p of profiles) {
    const matched = ARCHETYPES.find((a) => a.check(p, profiles)) || ARCHETYPES[ARCHETYPES.length - 1];
    p.archetype = matched.title;
    p.title = matched.title;
    p.roastNotes.push(matched.roast);
  }

  // Find extremes
  const sortedByMsgs = [...profiles].sort((a, b) => b.messageCount - a.messageCount);
  const sortedByNight = [...profiles].sort((a, b) => b.lateNightCount - a.lateNightCount);
  const sortedByLength = [...profiles].sort((a, b) => b.avgLength - a.avgLength);
  const sortedByCaps = [...profiles].sort((a, b) => b.allCapsCount - a.allCapsCount);

  const biggestInstigator = sortedByMsgs[0]?.name || detectedAuthors[0] || "Player 1";
  const biggestGhost = sortedByMsgs[sortedByMsgs.length - 1]?.name || detectedAuthors[1] || "Player 2";
  const biggestNightOwl = sortedByNight[0]?.name || biggestInstigator;
  const biggestEssayist = sortedByLength[0]?.name || biggestInstigator;
  const biggestShouter = sortedByCaps[0]?.name || biggestInstigator;

  return {
    participants: profiles,
    topTopics: ["food delivery orders", "flaky meetup plans", "aux cord playlist wars", "late night existential dread", "unanswered questions"],
    recurringInsideJokes: ["who is actually on the way", "who touched the aux", "sleeping through 47 alarms"],
    biggestNightOwl,
    biggestGhost,
    biggestEssayist,
    biggestShouter,
    biggestInstigator,
    totalMessages: messages.length,
  };
}
