// Central API Contracts for VYBZ // ARCADE SYSTEM

import {
  ArcadeOptionKey,
  VybzQuestion,
  PlayerBehavioralProfile,
  VybzRom,
} from "./vybz";
import { LeaderboardPlayer, RoomStatus } from "./multiplayer";

export interface TopQuote {
  id?: string;
  author: string;
  text: string;
  timestamp?: string;
}

// 1. Chat Ingestion
export interface ChatIngestResponse {
  sessionId: string;
  participants: string[];
  messageCount: number;
  topQuotes: TopQuote[];
  sampleSnippets?: string[];
}

// 2. Game Generation
export interface GenerateGameRequest {
  sessionId: string;
  rom: string | VybzRom;
  questionCount?: number;
  userId?: string;
}

export interface GenerateGameResponse {
  gameId: string;
  rom: string;
  questions: VybzQuestion[];
}

// 3. Game Answer
export interface SubmitAnswerRequest {
  gameId: string;
  questionId: string;
  userId?: string;
  selectedAnswer: ArcadeOptionKey;
  responseTimeMs?: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctAnswer: ArcadeOptionKey;
  points: number;
  totalScore: number;
  explanation: string;
}

// 4. Game Complete
export interface CompleteGameRequest {
  gameId: string;
  userId?: string;
}

export interface CompleteGameResponse {
  score: number;
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
  profileUpdate?: Partial<PlayerBehavioralProfile>;
}

// 5. Game Master
export type GameMasterAction =
  | "NEXT_QUESTION"
  | "HINT"
  | "BONUS_ROUND"
  | "DIFFICULTY_UP"
  | "DIFFICULTY_DOWN"
  | "GAME_END";

export interface GameMasterRequest {
  round: number;
  players: { id?: string; name: string; score: number }[];
  currentQuestion?: Partial<VybzQuestion>;
  scores: Record<string, number>;
}

export interface GameMasterResponse {
  action: GameMasterAction;
  message: string;
  difficulty?: string;
  category?: string;
}

// 6. Multiplayer Room Contracts
export interface CreateRoomRequest {
  gameId: string;
  hostUserId: string;
  displayName: string;
  settings?: {
    roundCount?: number;
    timeLimitSeconds?: number;
    mode?: string;
  };
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
  hostUserId: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  userId: string;
  displayName: string;
}

export interface JoinRoomResponse {
  roomId: string;
  roomCode: string;
  players: { userId: string; displayName: string; isHost: boolean }[];
  status: RoomStatus;
}

export interface SetReadyRequest {
  userId: string;
  ready: boolean;
}

export interface SubmitRoomAnswerRequest {
  userId: string;
  questionId: string;
  selectedAnswer: ArcadeOptionKey;
  responseTimeMs: number;
}

export interface SubmitRoomAnswerResponse {
  correct: boolean;
  correctAnswer: ArcadeOptionKey;
  points: number;
  totalScore: number;
  explanation: string;
}

export interface FinishRoomResponse {
  finished: boolean;
  leaderboard: LeaderboardPlayer[];
}

export type LeaderboardEntry = LeaderboardPlayer;

export * from "./vybz";
export * from "./multiplayer";
