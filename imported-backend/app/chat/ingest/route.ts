import { NextRequest, NextResponse } from "next/server";
import { parseChatLog } from "@/lib/chat/parser";
import { analyzeChatLore } from "@/lib/chat/analyzer";
import { db, isDatabaseConfigured, memoryDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let rawText = "";
    let fileName = "group_chat_export.txt";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: { code: "MISSING_FILE", message: "No file was uploaded in multipart payload." } },
          { status: 400 }
        );
      }
      rawText = await file.text();
      fileName = file.name;
    } else {
      const body = await request.json().catch(() => ({}));
      rawText = body.rawText || "";
      fileName = body.fileName || fileName;
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: { code: "EMPTY_PAYLOAD", message: "Chat content is empty." } },
        { status: 400 }
      );
    }

    // Safety limit: 15MB
    if (rawText.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "File exceeds 15MB maximum limit." } },
        { status: 413 }
      );
    }

    // 1. Parse WhatsApp format
    const { messages, participants, messageCount } = parseChatLog(rawText);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: { code: "UNPARSEABLE_CHAT", message: "Failed to extract messages from chat file." } },
        { status: 422 }
      );
    }

    // 2. Analyze Chat with OpenAI
    const analysis = await analyzeChatLore(messages, participants);

    // 3. Persist in PostgreSQL (or MemoryDB)
    const sessionId = `session_${Math.random().toString(36).substring(2, 11)}`;
    const sessionName = fileName.replace(/\.[^/.]+$/, "").toUpperCase();

    if (isDatabaseConfigured) {
      try {
        await db.chatSession.create({
          data: {
            id: sessionId,
            name: sessionName,
            messageCount: messages.length,
            participantCount: participants.length,
            analysisJson: analysis as any,
            participants: {
              create: participants.map((name) => ({ name })),
            },
            messages: {
              create: messages.slice(0, 1000).map((m) => ({
                id: m.id,
                author: m.author,
                text: m.text,
                timestamp: m.timestamp,
              })),
            },
          },
        });
      } catch (err) {
        console.warn("Failed to persist ChatSession to DB:", err);
      }
    }

    memoryDb.chatSessions.set(sessionId, {
      id: sessionId,
      name: sessionName,
      messages,
      participants,
      analysis,
    });

    const topQuotes = analysis.facts.notableQuotes.map((q) => ({
      id: q.messageId,
      author: q.author,
      text: q.text,
      timestamp: q.timestamp,
    }));

    const sampleSnippets = messages.slice(0, 5).map((m) => `[${m.author}]: "${m.text}"`);

    return NextResponse.json({
      sessionId,
      participants,
      messageCount,
      topQuotes,
      sampleSnippets,
    });
  } catch (error: any) {
    console.error("Chat Ingestion API Error:", error);
    return NextResponse.json(
      { error: { code: "INGESTION_FAILED", message: error?.message || "Internal server error." } },
      { status: 500 }
    );
  }
}
