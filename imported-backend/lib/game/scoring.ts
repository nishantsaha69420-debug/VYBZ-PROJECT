// Server-Authoritative Scoring Engine for VYBZ // ARCADE SYSTEM

import { LeaderboardPlayer } from "@/types/multiplayer";

export interface ScoreCalculationResult {
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  totalPoints: number;
}

/**
 * Calculate authoritative score with speed bonus
 */
export function calculateAnswerPoints(params: {
  isCorrect: boolean;
  responseTimeMs: number;
  timeLimitSeconds: number;
}): ScoreCalculationResult {
  if (!params.isCorrect) {
    return {
      isCorrect: false,
      basePoints: 0,
      speedBonus: 0,
      totalPoints: 0,
    };
  }

  const basePoints = 500;
  const timeLimitMs = Math.max(1000, params.timeLimitSeconds * 1000);
  const remainingMs = Math.max(0, timeLimitMs - params.responseTimeMs);
  const speedRatio = Math.min(1, Math.max(0, remainingMs / timeLimitMs));
  const speedBonus = Math.round(500 * speedRatio);

  return {
    isCorrect: true,
    basePoints,
    speedBonus,
    totalPoints: basePoints + speedBonus,
  };
}

/**
 * Compute Leaderboard sorted by score DESC
 */
export function buildLeaderboard(
  players: {
    userId: string;
    displayName: string;
    score: number;
    answers: { isCorrect: boolean; responseTimeMs: number }[];
    tag?: string;
  }[]
): LeaderboardPlayer[] {
  // Sort descending by score, tie-break on correct count
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aCorrect = a.answers.filter((ans) => ans.isCorrect).length;
    const bCorrect = b.answers.filter((ans) => ans.isCorrect).length;
    return bCorrect - aCorrect;
  });

  return sorted.map((p, index) => {
    const totalAnswers = p.answers.length;
    const correctAnswers = p.answers.filter((ans) => ans.isCorrect).length;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    const totalTime = p.answers.reduce((sum, ans) => sum + ans.responseTimeMs, 0);
    const averageResponseTime = totalAnswers > 0 ? Math.round(totalTime / totalAnswers) : 0;

    let badgeTitle = "CASUAL LURKER";
    if (index === 0 && accuracy >= 60) {
      badgeTitle = "THE GC ORACLE // #1 LORE MASTER";
    } else if (index === 0) {
      badgeTitle = "GC HISTORIAN // MATCH WINNER";
    } else if (index === 1) {
      badgeTitle = "VOICE NOTE SCHOLAR";
    } else if (index === 2) {
      badgeTitle = "CHAT CONNOISSEUR";
    } else if (correctAnswers > 0) {
      badgeTitle = "ACTIVE REGULAR";
    }

    return {
      rank: index + 1,
      userId: p.userId,
      displayName: p.displayName,
      score: p.score,
      correctAnswers,
      totalAnswers,
      accuracy,
      averageResponseTime,
      badgeTitle,
      tag: p.tag,
    };
  });
}
