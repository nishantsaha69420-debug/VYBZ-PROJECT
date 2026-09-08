import { NextRequest, NextResponse } from "next/server";
import { setPlayerReady } from "@/lib/multiplayer/room-engine";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { userId, ready = true } = body;

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: { code: "INVALID_READY_PAYLOAD", message: "roomId and userId are required." } },
        { status: 400 }
      );
    }

    const success = await setPlayerReady(roomId, userId, Boolean(ready));
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("Room Ready API Error:", error);
    return NextResponse.json(
      { error: { code: "READY_FAILED", message: error?.message || "Failed to update ready state." } },
      { status: 500 }
    );
  }
}
