import { NextRequest, NextResponse } from "next/server";
import { getOrCreatePlayerProfile } from "@/lib/profile/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: { code: "MISSING_USER_ID", message: "userId query parameter is required." } },
        { status: 400 }
      );
    }

    const profile = await getOrCreatePlayerProfile(userId);
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Profile API Error:", error);
    return NextResponse.json(
      { error: { code: "PROFILE_ERROR", message: error?.message || "Failed to fetch profile." } },
      { status: 500 }
    );
  }
}
