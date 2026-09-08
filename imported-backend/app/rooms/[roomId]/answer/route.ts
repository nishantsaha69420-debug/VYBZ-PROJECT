import { NextRequest, NextResponse } from "next/server";
import { submitRoomAnswer } from "@/lib/multiplayer/room-engine";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { userId, questionId, selectedAnswer, responseTimeMs = 1500 } = body;

    if (!roomId || !userId || !questionId || !selectedAnswer) {
      return NextResponse.json(
        { error: { code: "INVALID_ANSWER_PAYLOAD", message: "roomId, userId, questionId, and selectedAnswer are required." } },
        { status: 400 }
      );
    }

    const result = await submitRoomAnswer({
      roomId,
      userId,
      questionId,
      selectedAnswer,
      responseTimeMs,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Room Answer API Error:", error);
    const status = error?.message?.includes("QUESTION_INACTIVE") ? 409 : 400;
    return NextResponse.json(
      { error: { code: "SUBMISSION_FAILED", message: error?.message || "Failed to submit room answer." } },
      { status }
    );
  }
}
