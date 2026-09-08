import { NextRequest, NextResponse } from "next/server";
import { startRoomMatch, getRoomPollState } from "@/lib/multiplayer/room-engine";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { hostUserId } = body;

    if (!roomId || !hostUserId) {
      return NextResponse.json(
        { error: { code: "INVALID_START_PAYLOAD", message: "roomId and hostUserId are required." } },
        { status: 400 }
      );
    }

    await startRoomMatch(roomId, hostUserId);
    const updatedState = await getRoomPollState(roomId, hostUserId);

    return NextResponse.json(updatedState);
  } catch (error: any) {
    console.error("Room Start API Error:", error);
    const status = error?.message?.includes("UNAUTHORIZED") ? 403 : 400;
    return NextResponse.json(
      { error: { code: "START_FAILED", message: error?.message || "Failed to start room match." } },
      { status }
    );
  }
}
