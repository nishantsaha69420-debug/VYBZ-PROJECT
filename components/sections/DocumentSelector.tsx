"use client";

import React, { useState, useRef } from "react";
import { CHAT_PRESETS, ChatPreset } from "@/lib/mock-data/chat-presets";
import { apiClient } from "@/lib/api-client";
import { Barcode } from "@/components/ui/Barcode";
import { ArcadeChatUploader } from "@/components/ui/ArcadeChatUploader";
import { TopQuote } from "@/types/api";

interface DocumentSelectorProps {
  hasUploadedChat: boolean;
  onSelectChat: (chat: {
    sessionId?: string;
    title: string;
    participants: string[];
    topQuotes: TopQuote[];
    rawText: string;
    isCustomUpload?: boolean;
  }) => void;
  onScrollToSetup: () => void;
  playClickSound: () => void;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  hasUploadedChat,
  onSelectChat,
  onScrollToSetup,
  playClickSound,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("hackathon-night");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [customChatData, setCustomChatData] = useState<{
    sessionId?: string;
    title: string;
    participants: string[];
    topQuotes: TopQuote[];
    rawText: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = CHAT_PRESETS.find((p) => p.id === selectedPresetId) || CHAT_PRESETS[0];

  const handleSelectPreset = async (preset: ChatPreset) => {
    playClickSound();
    setIsCustomMode(false);
    setSelectedPresetId(preset.id);

    try {
      // Ingest into backend to register session and messages
      const res = await apiClient.ingestChat(preset.rawChatText, preset.title);
      onSelectChat({
        sessionId: res.sessionId,
        title: preset.title,
        participants: res.participants,
        topQuotes: res.topQuotes,
        rawText: preset.rawChatText,
      });
    } catch {
      onSelectChat({
        title: preset.title,
        participants: preset.participants,
        topQuotes: preset.topQuotes,
        rawText: preset.rawChatText,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playClickSound();
    setIsUploading(true);
    setUploadStatus("PARSING CHAT ARCHIVE...");
    setCustomFileName(file.name);

    try {
      const res = await apiClient.ingestChat(file);
      const rawText = await file.text();

      const parsedData = {
        sessionId: res.sessionId,
        title: file.name.replace(/\.[^/.]+$/, "").toUpperCase() + " // LORE",
        participants: res.participants,
        topQuotes: res.topQuotes,
        rawText,
      };

      setCustomChatData(parsedData);
      setIsCustomMode(true);
      setUploadStatus("CHAT ARCHIVE COMPILED");
      onSelectChat(parsedData);
    } catch (err: any) {
      console.error(err);
      setUploadStatus(`ERROR: ${err.message || "Failed to parse file"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const currentSelection = isCustomMode && customChatData ? customChatData : activePreset;

  return (
    <section
      id="section-document"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--chassis)",
        padding: "54px 0",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
        {/* Section Header */}
        <div
          className="reveal-fade-up"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 16,
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              className="jb"
              style={{
                fontSize: 10,
                color: "var(--green)",
                letterSpacing: "0.15em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="led led-g pulse-g" />
              PRIMARY STEP 01 // SOURCE ARCHIVE SELECTION
            </div>
            <h2
              className="sg"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "var(--txt)",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              SELECT GROUP CHAT LORE.
            </h2>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
              FORMAT: .TXT / .JSON / DISCORD / WHATSAPP
            </span>
            <Barcode val="DATA-FEED-01" h={18} color="var(--muted)" />
          </div>
        </div>

        {/* Two-Column Clean Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 28,
            alignItems: "stretch",
          }}
        >
          {/* Left Column: Primary File Upload (MANDATORY) & Sample Previews */}
          <div className="reveal-stagger-group" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* MANDATORY NOTICE HEADER */}
            <div
              style={{
                background: hasUploadedChat ? "rgba(57,255,20,0.08)" : "rgba(255,208,0,0.1)",
                border: `1px solid ${hasUploadedChat ? "var(--green)" : "var(--yellow)"}`,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`led ${hasUploadedChat ? "led-g pulse-g" : "led-y pulse-y"}`} />
                <span className="jb" style={{ fontSize: 10, fontWeight: 800, color: hasUploadedChat ? "var(--green)" : "var(--yellow)", letterSpacing: "0.08em" }}>
                  {hasUploadedChat
                    ? "✓ CHAT ARCHIVE VERIFIED // PERSONALITIES ANALYZED"
                    : "MANDATORY STEP: UPLOAD YOUR GROUP CHAT (.TXT / .JSON)"}
                </span>
              </div>
              <span className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
                {hasUploadedChat ? "READY TO PLAY" : "REQUIRED FOR GAMEPLAY"}
              </span>
            </div>

            {/* Custom Chat File Drop / Upload Standout Box (PRIMARY) */}
            <div
              className={`reveal-fade-up ${!hasUploadedChat ? "uploader-glow" : ""}`}
              style={{
                border: hasUploadedChat
                  ? "2px solid var(--green)"
                  : "2px dashed rgba(0, 229, 255, 0.8)",
                background: hasUploadedChat
                  ? "rgba(57,255,20,0.05)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.14) 0%, #07090D 80%)",
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
                transition: "all 0.25s ease",
              }}
            >
              {/* Corner Registration Neon Accents */}
              <div style={{ position: "absolute", top: -2, left: -2, width: 10, height: 10, borderTop: "2px solid var(--cyan)", borderLeft: "2px solid var(--cyan)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderTop: "2px solid var(--cyan)", borderRight: "2px solid var(--cyan)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -2, left: -2, width: 10, height: 10, borderBottom: "2px solid var(--cyan)", borderLeft: "2px solid var(--cyan)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderBottom: "2px solid var(--cyan)", borderRight: "2px solid var(--cyan)", pointerEvents: "none" }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="jb"
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      background: hasUploadedChat ? "var(--green)" : "var(--cyan)",
                      color: "#000",
                      padding: "3px 8px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {hasUploadedChat ? "CUSTOM CHAT LOADED" : "PRIMARY INGESTION PORT"}
                  </span>
                  <span className="jb" style={{ fontSize: 10, color: "var(--txt)", fontWeight: 700 }}>
                    DROP CHAT FILE (.TXT / .JSON)
                  </span>
                </div>
                {uploadStatus && (
                  <span className="jb" style={{ fontSize: 9, color: "var(--green)", fontWeight: 700 }}>
                    ● {uploadStatus}
                  </span>
                )}
              </div>

              <p
                className="jb"
                style={{
                  fontSize: 11,
                  color: "var(--txt2)",
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                Upload your group chat export from WhatsApp, Discord, Telegram, or any text file. The system scans the entire file to analyze each member&apos;s personality, habits, and hilarious dynamics!
              </p>

              {/* Supported Chat Format Badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="jb" style={{ fontSize: 8, color: "var(--muted)", letterSpacing: "0.08em" }}>
                  FORMATS:
                </span>
                {[
                  ["💬 WhatsApp .txt", "rgba(57,255,20,0.12)", "var(--green)"],
                  ["🎮 Discord .json", "rgba(88,101,242,0.18)", "#7289da"],
                  ["✈️ Telegram .json", "rgba(0,136,204,0.18)", "#00aaff"],
                  ["📱 Simple transcript (Name: Msg)", "rgba(255,208,0,0.12)", "var(--yellow)"],
                ].map(([label, bg, col]) => (
                  <span
                    key={label}
                    className="jb"
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      background: bg,
                      color: col,
                      border: `1px solid ${col}`,
                      padding: "2px 6px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <ArcadeChatUploader
                onChatLoaded={(chat) => {
                  setCustomChatData(chat);
                  setIsCustomMode(true);
                  setCustomFileName(chat.title);
                  onSelectChat({ ...chat, isCustomUpload: true });
                }}
                playClickSound={playClickSound}
              />
            </div>

            {/* Visual Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "12px 0 4px",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />
              <div
                className="jb"
                style={{
                  fontSize: 9,
                  color: "var(--muted)",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                }}
              >
                SAMPLE PREVIEW TEMPLATES (UPLOAD REQUIRED TO PLAY)
              </div>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />
            </div>

            {CHAT_PRESETS.map((preset) => {
              const isSelected = !isCustomMode && selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="reveal-stagger-item"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: isSelected ? "rgba(255,208,0,0.06)" : "var(--void)",
                    border: `1px solid ${isSelected ? "var(--yellow)" : "var(--border)"}`,
                    padding: "14px 18px",
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                    position: "relative",
                    opacity: hasUploadedChat ? 0.6 : 0.85,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "rgba(255,208,0,0.2)",
                      color: "var(--yellow)",
                      borderLeft: "1px solid var(--yellow)",
                      borderBottom: "1px solid var(--yellow)",
                      fontFamily: "var(--jb)",
                      fontSize: 8,
                      fontWeight: 700,
                      padding: "2px 6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    PREVIEW ONLY
                  </div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      letterSpacing: "0.1em",
                      marginBottom: 4,
                    }}
                  >
                    {preset.badge} • {preset.subtitle}
                  </div>
                  <div
                    className="sg"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: isSelected ? "var(--yellow)" : "#C0C4CC",
                      marginBottom: 4,
                    }}
                  >
                    {preset.title}
                  </div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Lore Inspector & Verification Card */}
          <div
            className="reveal-fade-up"
            style={{
              background: "var(--void)",
              border: "1px solid var(--border)",
              padding: "24px 26px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 10,
                  marginBottom: 18,
                }}
              >
                <div
                  className="jb"
                  style={{
                    fontSize: 9,
                    color: "var(--yellow)",
                    letterSpacing: "0.1em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="led led-y pulse-y" />
                  CARTRIDGE INSPECTION // ACTIVE BUFFER
                </div>
                <span className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
                  STATUS: READY FOR GAMEPLAY
                </span>
              </div>

              <div
                className="sg"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--txt)",
                  marginBottom: 16,
                }}
              >
                {currentSelection.title}
              </div>

              {/* Stats Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  background: "#080A0D",
                  border: "1px solid var(--border)",
                  padding: "12px",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div className="jb" style={{ fontSize: 8, color: "var(--muted)" }}>
                    PARTICIPANTS
                  </div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--green)",
                    }}
                  >
                    {currentSelection.participants.length}
                  </div>
                </div>
                <div>
                  <div className="jb" style={{ fontSize: 8, color: "var(--muted)" }}>
                    LORE QUOTES
                  </div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--yellow)",
                    }}
                  >
                    {currentSelection.topQuotes.length}
                  </div>
                </div>
                <div>
                  <div className="jb" style={{ fontSize: 8, color: "var(--muted)" }}>
                    READINESS
                  </div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--txt)",
                    }}
                  >
                    100%
                  </div>
                </div>
              </div>

              {/* Detected Participants List */}
              <div style={{ marginBottom: 20 }}>
                <div
                  className="jb"
                  style={{
                    fontSize: 9,
                    color: "var(--muted)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  DETECTED GC MEMBERS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentSelection.participants.map((name) => (
                    <span
                      key={name}
                      className="jb"
                      style={{
                        fontSize: 10,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--border)",
                        color: "var(--txt)",
                        padding: "3px 8px",
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Quote Preview */}
              <div>
                <div
                  className="jb"
                  style={{
                    fontSize: 9,
                    color: "var(--muted)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  SAMPLE ARCHIVED QUOTE
                </div>
                {currentSelection.topQuotes[0] && (
                  <div
                    style={{
                      background: "#050607",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid var(--yellow)",
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      className="jb"
                      style={{
                        fontSize: 11,
                        color: "var(--txt)",
                        fontStyle: "italic",
                        marginBottom: 4,
                      }}
                    >
                      &quot;{currentSelection.topQuotes[0].text}&quot;
                    </div>
                    <div
                      className="jb"
                      style={{ fontSize: 9, color: "var(--yellow)" }}
                    >
                      — {currentSelection.topQuotes[0].author}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Jump to Match Setup */}
            <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <button
                disabled={!hasUploadedChat}
                onClick={() => {
                  if (!hasUploadedChat) return;
                  playClickSound();
                  onScrollToSetup();
                }}
                className={hasUploadedChat ? "btn-green" : ""}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: hasUploadedChat ? "pointer" : "not-allowed",
                  background: hasUploadedChat ? "var(--green)" : "rgba(255,208,0,0.06)",
                  color: hasUploadedChat ? "#000" : "var(--yellow)",
                  border: hasUploadedChat ? "none" : "1px solid var(--yellow)",
                  transition: "all 0.2s ease",
                  boxShadow: hasUploadedChat ? "0 0 20px rgba(57,255,20,0.3)" : "none",
                }}
              >
                {hasUploadedChat
                  ? "PROCEED TO MATCH CONFIGURATION & LOBBY →"
                  : "🔒 UPLOAD CHAT ARCHIVE FIRST (STEP 01 REQUIRED)"}
              </button>
              {!hasUploadedChat && (
                <div className="jb" style={{ fontSize: 9, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                  Drop or browse your WhatsApp, Discord, or .txt export above to unlock matchmaking.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
