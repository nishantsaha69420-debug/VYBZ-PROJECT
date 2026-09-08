// Core Domain Types for VYBZ // ARCADE SYSTEM

export type ArcadeOptionKey = "A" | "B" | "C" | "D";

export interface ArcadeOption {
  key: ArcadeOptionKey;
  label: string;
  tag: string;
}

export type VybzRom =
  | "ROM_001"
  | "ROM_002"
  | "ROM_003"
  | "ROM_004"
  | "ROM_005";

export type QuestionSourceType =
  | "WHO_SAID_IT"
  | "MEMORY"
  | "OPINION"
  | "RELATIONSHIP"
  | "CHAOS";

export type QuestionDifficulty = "easy" | "medium" | "hard" | "extreme";

export interface VybzQuestion {
  id: string;
  round: string;
  category: string;
  prompt: string;
  quote: string;
  options: [ArcadeOption, ArcadeOption, ArcadeOption, ArcadeOption];
  correctAnswer: ArcadeOptionKey;
  explanation: string;
  difficulty: QuestionDifficulty;
  sourceType: QuestionSourceType;
  sourceMessageIds: string[];
}

export interface ParsedChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface ChatAnalysisFacts {
  participants: string[];
  totalMessagesAnalyzed: number;
  dateRange?: { start: string; end: string };
  notableQuotes: {
    messageId: string;
    author: string;
    text: string;
    timestamp: string;
  }[];
}

export interface ChatAnalysisInferences {
  recurringTopics: string[];
  interests: string[];
  memorableEvents: string[];
  insideJokes: string[];
  opinions: {
    author: string;
    topic: string;
    opinion: string;
    sourceMessageId?: string;
  }[];
  relationships: {
    pair: [string, string];
    dynamic: string;
    sentiment: string;
  }[];
  groupDynamics: string[];
  personalitySignals: Record<string, string>;
  recurringArguments: string[];
  recurringActivities: string[];
}

export interface ChatAnalysisResult {
  facts: ChatAnalysisFacts;
  inferences: ChatAnalysisInferences;
}

export interface PlayerBehavioralProfile {
  userId: string;
  displayName: string;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  accuracy: number;
  preferredModes: string[];
  preferredDifficulty: string;
  strongAreas: string[];
  weakAreas: string[];
  participantAffinity: Record<string, { correct: number; total: number }>;
  answerHistory: {
    gameId: string;
    category: string;
    isCorrect: boolean;
    responseTimeMs: number;
  }[];
  recentGames: {
    gameId: string;
    rom: string;
    score: number;
    accuracy: number;
    playedAt: string;
  }[];
}
