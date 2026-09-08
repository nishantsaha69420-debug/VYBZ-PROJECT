import { NextRequest, NextResponse } from "next/server";
import { getRoomPollState, resolveRoomId } from "@/lib/multiplayer/room-engine";
import { db, isDatabaseConfigured, memoryDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId: rawRoomId } = await context.params;
    const roomId = await resolveRoomId(rawRoomId);

    if (isDatabaseConfigured) {
      try {
        await db.gameRoom.update({
          where: { id: roomId },
          data: { status: "FINISHED", endedAt: new Date() },
        });
      } catch {
        /**/
      }
    }

    const memRoom = memoryDb.gameRooms.get(roomId);
    if (memRoom) {
      memRoom.status = "FINISHED";
      memRoom.endedAt = new Date().toISOString();
    }

    const poll = await getRoomPollState(roomId);

    return NextResponse.json({
      finished: true,
      leaderboard: poll.leaderboard,
    });
  } catch (error: any) {
    console.error("Room Finish API Error:", error);
    return NextResponse.json(
      { error: { code: "FINISH_FAILED", message: error?.message || "Failed to finish room." } },
      { status: 500 }
    );
  }
}
