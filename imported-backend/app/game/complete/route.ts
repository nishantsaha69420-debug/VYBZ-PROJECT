import { NextRequest, NextResponse } from "next/server";
import { recordGameCompletion } from "@/lib/profile/service";
import { db, isDatabaseConfigured, memoryDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { gameId, userId = "default-user" } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: { code: "MISSING_GAME_ID", message: "gameId is required to complete a game." } },
        { status: 400 }
      );
    }

    let game: any = null;
    let answers: any[] = [];

    if (isDatabaseConfigured) {
      try {
        game = await db.game.findUnique({
          where: { id: gameId },
          include: { questions: true },
        });
        answers = await db.gameAnswer.findMany({
          where: { gameId, userId },
          include: { question: true },
        });

        await db.game.update({
          where: { id: gameId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      } catch {
        /**/
      }
    }

    if (!game) {
      game = memoryDb.games.get(gameId);
      answers = Array.from(memoryDb.gameAnswers.values()).filter(
        (a: any) => a.gameId === gameId && a.userId === userId
      );
    }

    const totalQuestions = game?.questionCount || 5;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = answers.reduce((sum, a) => sum + (a.points || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Compile category breakdown for adaptation
    const categoryStats: Record<string, { correct: number; total: number }> = {};
    for (const a of answers) {
      const cat = a.question?.category || "GENERAL";
      if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };
      categoryStats[cat].total += 1;
      if (a.isCorrect) categoryStats[cat].correct += 1;
    }

    const updatedProfile = await recordGameCompletion({
      userId,
      gameId,
      rom: game?.rom || "ROM_001",
      score,
      accuracy,
      categoryStats,
    });

    return NextResponse.json({
      score,
      accuracy,
      correctAnswers,
      totalQuestions,
      profileUpdate: {
        gamesPlayed: updatedProfile.gamesPlayed,
        totalScore: updatedProfile.totalScore,
        averageScore: updatedProfile.averageScore,
        accuracy: updatedProfile.accuracy,
        strongAreas: updatedProfile.strongAreas,
        weakAreas: updatedProfile.weakAreas,
      },
    });
  } catch (error: any) {
    console.error("Game Complete API Error:", error);
    return NextResponse.json(
      { error: { code: "COMPLETION_FAILED", message: error?.message || "Failed to complete game." } },
      { status: 500 }
    );
  }
}
