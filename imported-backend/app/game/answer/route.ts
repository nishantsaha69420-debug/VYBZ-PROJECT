import { NextRequest, NextResponse } from "next/server";
import { calculateAnswerPoints } from "@/lib/game/scoring";
import { db, isDatabaseConfigured, memoryDb } from "@/lib/db";
import { ArcadeOptionKey } from "@/types/vybz";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      gameId,
      questionId,
      selectedAnswer,
      responseTimeMs = 1500,
      userId = "default-user",
    } = body;

    if (!gameId || !questionId || !selectedAnswer) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYLOAD", message: "gameId, questionId, and selectedAnswer are required." } },
        { status: 400 }
      );
    }

    let question: any = null;

    if (isDatabaseConfigured) {
      try {
        question = await db.gameQuestion.findUnique({
          where: { id: questionId },
        });
      } catch {
        /**/
      }
    }

    if (!question) {
      const memGame = memoryDb.games.get(gameId);
      question = memGame?.questions?.find((q: any) => q.id === questionId);
    }

    if (!question) {
      return NextResponse.json(
        { error: { code: "QUESTION_NOT_FOUND", message: `Question ${questionId} not found in game ${gameId}.` } },
        { status: 404 }
      );
    }

    const isCorrect = selectedAnswer === question.correctAnswer;
    const scoreResult = calculateAnswerPoints({
      isCorrect,
      responseTimeMs,
      timeLimitSeconds: 15,
    });

    let totalScore = scoreResult.totalPoints;

    if (isDatabaseConfigured) {
      try {
        await db.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId, displayName: "Player" },
        });

        // Record Answer
        await db.gameAnswer.upsert({
          where: {
            gameId_questionId_userId: {
              gameId,
              questionId,
              userId,
            },
          },
          update: {
            selectedAnswer,
            isCorrect,
            responseTimeMs,
            points: scoreResult.totalPoints,
          },
          create: {
            gameId,
            questionId,
            userId,
            selectedAnswer,
            isCorrect,
            responseTimeMs,
            points: scoreResult.totalPoints,
          },
        });

        const allAnswers = await db.gameAnswer.findMany({
          where: { gameId, userId },
        });
        totalScore = allAnswers.reduce((sum, a) => sum + a.points, 0);
      } catch (err) {
        console.warn("DB GameAnswer persistence failed, falling back to memory:", err);
      }
    }

    // Memory DB fallback
    const memAnsKey = `${gameId}_${questionId}_${userId}`;
    memoryDb.gameAnswers.set(memAnsKey, {
      gameId,
      questionId,
      userId,
      selectedAnswer,
      isCorrect,
      responseTimeMs,
      points: scoreResult.totalPoints,
    });

    return NextResponse.json({
      correct: isCorrect,
      correctAnswer: question.correctAnswer as ArcadeOptionKey,
      points: scoreResult.totalPoints,
      totalScore,
      explanation: question.explanation || "Attributed from source group chat log.",
    });
  } catch (error: any) {
    console.error("Game Answer API Error:", error);
    return NextResponse.json(
      { error: { code: "SUBMISSION_FAILED", message: error?.message || "Failed to submit answer." } },
      { status: 500 }
    );
  }
}
