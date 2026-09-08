// Persistent Player Profile Service for VYBZ // ARCADE SYSTEM

import { db, isDatabaseConfigured, memoryDb } from "../db";
import { PlayerBehavioralProfile } from "@/types/vybz";

export async function getOrCreatePlayerProfile(
  userId: string,
  displayName?: string
): Promise<PlayerBehavioralProfile> {
  const safeName = displayName || "Player";

  if (isDatabaseConfigured) {
    try {
      // Ensure user exists
      await db.user.upsert({
        where: { id: userId },
        update: { displayName: safeName },
        create: { id: userId, displayName: safeName },
      });

      const profile = await db.playerProfile.findUnique({
        where: { userId },
      });

      if (profile) {
        return {
          userId: profile.userId,
          displayName: safeName,
          gamesPlayed: profile.gamesPlayed,
          totalScore: profile.totalScore,
          averageScore: profile.averageScore,
          accuracy: profile.accuracy,
          preferredModes: (profile.preferredModes as string[]) || [],
          preferredDifficulty: profile.preferredDifficulty || "medium",
          strongAreas: (profile.strongAreas as string[]) || [],
          weakAreas: (profile.weakAreas as string[]) || [],
          participantAffinity: (profile.participantAffinity as any) || {},
          answerHistory: (profile.answerHistory as any[]) || [],
          recentGames: (profile.recentGames as any[]) || [],
        };
      }

      // Create new profile in DB
      const created = await db.playerProfile.create({
        data: {
          userId,
          gamesPlayed: 0,
          totalScore: 0,
          averageScore: 0,
          accuracy: 0,
          preferredModes: ["ROM_001"],
          preferredDifficulty: "medium",
          strongAreas: [],
          weakAreas: [],
          participantAffinity: {},
          answerHistory: [],
          recentGames: [],
        },
      });

      return {
        userId: created.userId,
        displayName: safeName,
        gamesPlayed: 0,
        totalScore: 0,
        averageScore: 0,
        accuracy: 0,
        preferredModes: ["ROM_001"],
        preferredDifficulty: "medium",
        strongAreas: [],
        weakAreas: [],
        participantAffinity: {},
        answerHistory: [],
        recentGames: [],
      };
    } catch (err) {
      console.warn("DB Profile lookup failed, using in-memory store:", err);
    }
  }

  // Fallback to in-memory store
  let memProfile = memoryDb.playerProfiles.get(userId);
  if (!memProfile) {
    memProfile = {
      userId,
      displayName: safeName,
      gamesPlayed: 0,
      totalScore: 0,
      averageScore: 0,
      accuracy: 0,
      preferredModes: ["ROM_001"],
      preferredDifficulty: "medium",
      strongAreas: [],
      weakAreas: [],
      participantAffinity: {},
      answerHistory: [],
      recentGames: [],
    };
    memoryDb.playerProfiles.set(userId, memProfile);
  }
  return memProfile;
}

export async function recordGameCompletion(params: {
  userId: string;
  gameId: string;
  rom: string;
  score: number;
  accuracy: number;
  categoryStats?: Record<string, { correct: number; total: number }>;
}): Promise<PlayerBehavioralProfile> {
  const current = await getOrCreatePlayerProfile(params.userId);

  const updatedGamesPlayed = current.gamesPlayed + 1;
  const updatedTotalScore = current.totalScore + params.score;
  const updatedAverageScore = Math.round(updatedTotalScore / updatedGamesPlayed);
  const updatedAccuracy = Math.round(
    (current.accuracy * current.gamesPlayed + params.accuracy) / updatedGamesPlayed
  );

  const newRecentGames = [
    {
      gameId: params.gameId,
      rom: params.rom,
      score: params.score,
      accuracy: params.accuracy,
      playedAt: new Date().toISOString(),
    },
    ...(current.recentGames || []).slice(0, 9),
  ];

  // Derive strong and weak areas from categoryStats
  const strongSet = new Set(current.strongAreas || []);
  const weakSet = new Set(current.weakAreas || []);

  if (params.categoryStats) {
    for (const [cat, stats] of Object.entries(params.categoryStats)) {
      if (stats.total >= 2) {
        if (stats.correct / stats.total >= 0.7) {
          strongSet.add(cat);
          weakSet.delete(cat);
        } else if (stats.correct / stats.total <= 0.4) {
          weakSet.add(cat);
          strongSet.delete(cat);
        }
      }
    }
  }

  const updatedProfile: PlayerBehavioralProfile = {
    ...current,
    gamesPlayed: updatedGamesPlayed,
    totalScore: updatedTotalScore,
    averageScore: updatedAverageScore,
    accuracy: updatedAccuracy,
    strongAreas: Array.from(strongSet),
    weakAreas: Array.from(weakSet),
    recentGames: newRecentGames,
  };

  if (isDatabaseConfigured) {
    try {
      await db.playerProfile.update({
        where: { userId: params.userId },
        data: {
          gamesPlayed: updatedGamesPlayed,
          totalScore: updatedTotalScore,
          averageScore: updatedAverageScore,
          accuracy: updatedAccuracy,
          strongAreas: updatedProfile.strongAreas,
          weakAreas: updatedProfile.weakAreas,
          recentGames: updatedProfile.recentGames,
        },
      });
    } catch (err) {
      console.warn("Failed to persist updated profile to DB:", err);
    }
  }

  memoryDb.playerProfiles.set(params.userId, updatedProfile);
  return updatedProfile;
}
