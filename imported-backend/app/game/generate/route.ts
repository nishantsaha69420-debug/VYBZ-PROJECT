import { NextRequest, NextResponse } from "next/server";
import { generateGameQuestions } from "@/lib/game/generator";
import { computeAdaptationDirectives, applyAdaptationToQuestions } from "@/lib/game/adaptation";
import { getOrCreatePlayerProfile } from "@/lib/profile/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, rom = "ROM_001", questionCount = 5, userId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: "MISSING_SESSION_ID", message: "sessionId is required to generate a game." } },
        { status: 400 }
      );
    }

    const result = await generateGameQuestions({
      sessionId,
      rom,
      questionCount,
      userId,
    });

    // Apply player profile adaptation if user is identified
    if (userId) {
      const profile = await getOrCreatePlayerProfile(userId);
      const directives = computeAdaptationDirectives(profile);
      result.questions = applyAdaptationToQuestions(result.questions, directives);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Game Generation API Error:", error);
    return NextResponse.json(
      { error: { code: "GENERATION_FAILED", message: error?.message || "Failed to generate game." } },
      { status: 500 }
    );
  }
}
