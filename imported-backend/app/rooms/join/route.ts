import { NextRequest, NextResponse } from "next/server";
import { joinGameRoom } from "@/lib/multiplayer/room-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomCode, userId, displayName } = body;

    if (!roomCode || !userId || !displayName) {
      return NextResponse.json(
        { error: { code: "INVALID_JOIN_PAYLOAD", message: "roomCode, userId, and displayName are required." } },
        { status: 400 }
      );
    }

    const result = await joinGameRoom({
      roomCode,
      userId,
      displayName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Join Room API Error:", error);
    const status = error?.message?.includes("ROOM_NOT_FOUND") ? 404 : 400;
    return NextResponse.json(
      { error: { code: "JOIN_ROOM_FAILED", message: error?.message || "Failed to join room." } },
      { status }
    );
  }
}
