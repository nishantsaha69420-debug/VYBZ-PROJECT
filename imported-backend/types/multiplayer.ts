// Multiplayer Types & State Machine Contracts for VYBZ // ARCADE SYSTEM

import { ArcadeOptionKey, VybzQuestion } from "./vybz";

export type RoomStatus =
  | "LOBBY"
  | "COUNTDOWN"
  | "QUESTION"
  | "RESULTS"
  | "FINISHED";

export interface MultiplayerPlayer {
  id: string;
  userId: string;
  displayName: string;
  name?: string;
  score: number;
  isReady: boolean;
  isConnected: boolean;
  lastSeenAt: string;
  isHost: boolean;
  avatarTag?: string;
  tag?: string;
  hasAnsweredCurrent?: boolean;
  lastAnswer?: {
    questionId: string;
    selectedAnswer: ArcadeOptionKey;
    optionKey?: ArcadeOptionKey;
    isCorrect: boolean;
    responseTimeMs: number;
    points: number;
    pointsAwarded?: number;
  };
}

export interface LeaderboardPlayer {
  rank: number;
  userId: string;
  id?: string;
  displayName: string;
  name?: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  badgeTitle: string;
  tag?: string;
}

export interface RoomPollState {
  roomId: string;
  roomCode: string;
  code?: string;
  hostId?: string;
  id?: string;
  gameId: string;
  hostUserId: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: string | null;
  questionDeadline: string | null;
  remainingSeconds: number;
  currentQuestion: (Omit<VybzQuestion, "correctAnswer" | "explanation"> & {
    correctAnswer?: ArcadeOptionKey;
    explanation?: string;
  }) | null;
  activeQuestion?: any;
  settings?: {
    roundCount: number;
    timeLimitSeconds: number;
    mode: string;
  };
  players: MultiplayerPlayer[];
  leaderboard: LeaderboardPlayer[];
  recentEvents: {
    type: string;
    payload: any;
    createdAt: string;
  }[];
  isHost: boolean;
}
