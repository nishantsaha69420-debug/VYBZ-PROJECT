import { NextRequest, NextResponse } from "next/server";
import { getRoomPollState } from "@/lib/multiplayer/room-engine";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;

    if (!roomId) {
      return NextResponse.json(
        { error: { code: "MISSING_ROOM_ID", message: "roomId is required." } },
        { status: 400 }
      );
    }

    const pollState = await getRoomPollState(roomId, userId);
    return NextResponse.json(pollState);
  } catch (error: any) {
    console.error("Room Poll API Error:", error);
    const status = error?.message?.includes("ROOM_NOT_FOUND") ? 404 : 500;
    return NextResponse.json(
      { error: { code: "POLL_FAILED", message: error?.message || "Failed to poll room state." } },
      { status }
    );
  }
}
