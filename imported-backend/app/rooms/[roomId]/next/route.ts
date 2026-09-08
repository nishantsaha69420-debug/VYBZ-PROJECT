import { NextRequest, NextResponse } from "next/server";
import { advanceRoomQuestion, getRoomPollState } from "@/lib/multiplayer/room-engine";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { hostUserId } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: { code: "MISSING_ROOM_ID", message: "roomId is required." } },
        { status: 400 }
      );
    }

    await advanceRoomQuestion(roomId, hostUserId);
    const updatedState = await getRoomPollState(roomId, hostUserId);

    return NextResponse.json(updatedState);
  } catch (error: any) {
    console.error("Room Advance API Error:", error);
    return NextResponse.json(
      { error: { code: "ADVANCE_FAILED", message: error?.message || "Failed to advance room." } },
      { status: 500 }
    );
  }
}
