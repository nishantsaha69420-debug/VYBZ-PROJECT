import { NextRequest, NextResponse } from "next/server";
import { createGameRoom } from "@/lib/multiplayer/room-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { gameId, hostUserId, displayName, settings } = body;

    if (!gameId || !hostUserId || !displayName) {
      return NextResponse.json(
        { error: { code: "INVALID_ROOM_PAYLOAD", message: "gameId, hostUserId, and displayName are required." } },
        { status: 400 }
      );
    }

    const result = await createGameRoom({
      gameId,
      hostUserId,
      displayName,
      settings,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Create Room API Error:", error);
    return NextResponse.json(
      { error: { code: "CREATE_ROOM_FAILED", message: error?.message || "Failed to create room." } },
      { status: 500 }
    );
  }
}
