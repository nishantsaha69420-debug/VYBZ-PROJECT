import { NextRequest, NextResponse } from "next/server";
import { generateStructuredJson, isGeminiConfigured } from "@/lib/gemini";
import { Type, Schema } from "@google/genai";
import { GameMasterRequest, GameMasterResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body: GameMasterRequest = await request.json().catch(() => ({}));
    const { round = 1, players = [], scores = {} } = body;

    const topPlayer = players.slice().sort((a, b) => b.score - a.score)[0];
    const topScore = topPlayer?.score || 0;

    if (isGeminiConfigured) {
      try {
        const systemPrompt = `You are the VYBZ AI Game Master arbiter.
Evaluate the current game bench state and suggest a dramatic arcade commentary action.
Permitted actions: NEXT_QUESTION, HINT, BONUS_ROUND, DIFFICULTY_UP, DIFFICULTY_DOWN, GAME_END.
Never mutate the game directly. Return pure JSON with keys: action, message, difficulty (optional), category (optional).`;

        const userPrompt = `Round: ${round}\nScores: ${JSON.stringify(scores)}\nTop Player: ${topPlayer?.name || "Player"} with ${topScore} pts`;

        const responseSchema: Schema = {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            message: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["action", "message"],
        };

        const res = await generateStructuredJson<GameMasterResponse>({
          systemPrompt,
          userPrompt,
          temperature: 0.4,
          responseSchema,
        });

        return NextResponse.json(res);
      } catch (err) {
        console.warn("Gemini Game Master fallback triggered:", err);
      }
    }

    // Deterministic Rule-Based Game Master
    let action: GameMasterResponse["action"] = "NEXT_QUESTION";
    let message = "Heuristic weights recalibrated. Proceeding to next round.";

    if (round >= 5) {
      action = "GAME_END";
      message = "FINAL ROUND COMPLETED // ALL LORE VECTORS EVALUATED";
    } else if (topScore >= 2500) {
      action = "BONUS_ROUND";
      message = "HEURISTIC MULTIPLIER ACTIVE // ACCURACY THRESHOLD SURPASSED";
    } else if (topScore < 500 && round > 2) {
      action = "HINT";
      message = "TACTICAL HINT // VERIFY AUTHOR QUOTE TIMESTAMP METRICS";
    }

    return NextResponse.json({
      action,
      message,
      difficulty: "NORMAL",
    });
  } catch (error: any) {
    console.error("Game Master API Error:", error);
    return NextResponse.json(
      { error: { code: "MASTER_ERROR", message: error?.message || "Game Master error" } },
      { status: 500 }
    );
  }
}
