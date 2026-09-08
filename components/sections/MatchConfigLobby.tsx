"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Barcode } from "@/components/ui/Barcode";
import { TopQuote } from "@/types/api";

interface MatchConfigLobbyProps {
  chatLore: {
    sessionId?: string;
    title: string;
    participants: string[];
    topQuotes: TopQuote[];
    rawText: string;
  };
  activeRoom: any | null;
  playerId: string;
  playerName: string;
  hasUploadedChat: boolean;
  onGoToUpload?: () => void;
  onPlayerNameChange: (name: string) => void;
  onRoomCreatedOrJoined: (room: any) => void;
  onStartMatch: () => void;
  onLeaveRoom?: () => void;
  playClickSound: () => void;
}

const MODES = [
  {
    id: "ROM // 001: WHO SAID IT?",
    title: "ROM 001 // WHO SAID IT?",
    desc: "Direct attribution: Identify who authored real archived group chat quotes.",
    badge: "CANON LORE",
  },
  {
    id: "ROM // 002: MEMORY BANK",
    title: "ROM 002 // MEMORY BANK",
    desc: "Chronological recall: Remember when key moments and lore unfolded.",
    badge: "CHRONOLOGY",
  },
  {
    id: "ROM // 003: FRIENDSHIP QUIZ",
    title: "ROM 003 // FRIENDSHIP QUIZ",
    desc: "Behavior & affinity prediction: Test who knows whose habits the best.",
    badge: "DYNAMICS",
  },
  {
    id: "ROM // 004: HOT TAKE MACHINE",
    title: "ROM 004 // HOT TAKE MACHINE",
    desc: "Spiciest opinions: Unpack the most controversial takes in the chat history.",
    badge: "CHAOS DIALOG",
  },
  {
    id: "ROM // 005: CHAOS MODE",
    title: "ROM 005 // CHAOS MODE",
    desc: "Rapid-fire unfiltered trivia with zero mercy and dynamic curveballs.",
    badge: "UNFILTERED",
  },
];

export const MatchConfigLobby: React.FC<MatchConfigLobbyProps> = ({
  chatLore,
  activeRoom,
  playerId,
  playerName,
  hasUploadedChat,
  onGoToUpload,
  onPlayerNameChange,
  onRoomCreatedOrJoined,
  onStartMatch,
  onLeaveRoom,
  playClickSound,
}) => {
  const [tab, setTab] = useState<"host" | "join">("host");
  const [roundCount, setRoundCount] = useState<number>(5);
  const [selectedMode, setSelectedMode] = useState<string>("ROM // 001: WHO SAID IT?");
  const [targetPlayers, setTargetPlayers] = useState<number>(4);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(15);
  const [joinSuffix, setJoinSuffix] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const isHost = activeRoom
    ? activeRoom.hostId === playerId || activeRoom.hostUserId === playerId
    : tab === "host";

  // Host creates a room
  const handleCreateRoom = async () => {
    if (!hasUploadedChat) {
      setErrorMessage("CHAT ARCHIVE REQUIRED // You must upload your group chat text file (.txt or .json) in Step 01 before hosting a game.");
      return;
    }
    if (!playerName.trim()) {
      setErrorMessage("Please enter your player nickname first.");
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    playClickSound();

    try {
      let sessionId = chatLore.sessionId;
      if (!sessionId) {
        const ingestRes = await apiClient.ingestChat(chatLore.rawText, chatLore.title);
        sessionId = ingestRes.sessionId;
      }

      // 1. Generate Game
      const gameRes = await apiClient.generateGame({
        sessionId,
        rom: selectedMode,
        questionCount: Math.max(1, Math.min(30, roundCount || 5)),
        userId: playerId,
      });

      // 2. Create Multiplayer Room
      const createRes = await apiClient.createRoom({
        gameId: gameRes.gameId,
        hostUserId: playerId,
        displayName: playerName.trim(),
        settings: {
          roundCount: Math.max(1, Math.min(30, roundCount || 5)),
          timeLimitSeconds: Math.max(1, Math.min(120, timeLimitSeconds || 15)),
          mode: selectedMode,
        },
      });

      // 3. Fetch Full Room State
      const room = await apiClient.getRoom(createRes.roomId, playerId);
      onRoomCreatedOrJoined(room);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to create multiplayer room.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Suffix input cleaner (autofills and strips VYBZ- if pasted or typed)
  const handleSuffixChange = (val: string) => {
    let clean = val.toUpperCase().trim();
    if (clean.startsWith("VYBZ-")) {
      clean = clean.replace(/^VYBZ-/, "");
    } else if (clean.startsWith("VYBZ")) {
      clean = clean.replace(/^VYBZ/, "");
    }
    clean = clean.replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setJoinSuffix(clean);
  };

  // Player joins an existing room
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your player nickname first.");
      return;
    }
    const cleanSuffix = joinSuffix.trim();
    if (!cleanSuffix) {
      setErrorMessage("Please enter the 4-character Room Code (e.g. 4829 or 7K4P).");
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    playClickSound();

    const fullCode = `VYBZ-${cleanSuffix}`;

    try {
      const joinRes = await apiClient.joinRoom({
        roomCode: fullCode,
        userId: playerId,
        displayName: playerName.trim(),
      });
      const room = await apiClient.getRoom(joinRes.roomId, playerId);
      onRoomCreatedOrJoined(room);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || `Failed to join room ${fullCode}. Verify the code.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy shareable join link
  const handleCopyLink = () => {
    playClickSound();
    if (!activeRoom) return;
    const code = activeRoom.roomCode || activeRoom.code;
    const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(code)}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {
          fallbackCopy(shareUrl);
        });
      } else {
        fallbackCopy(shareUrl);
      }
    } catch {
      fallbackCopy(shareUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch {}
  };

  return (
    <section
      id="section-lobby"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--void)",
        padding: "54px 0",
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
                color: "var(--yellow)",
                letterSpacing: "0.15em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="led led-y pulse-y" />
              STEP 02 // MULTIPLAYER HOSTING & GAME SETUP
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
              {activeRoom
                ? `ROOM LOBBY: ${activeRoom.code}`
                : "CONFIGURE RULES & HOST DEVICES."}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
              SYNCHRONIZED ROOM ENGINE // ALL DEVICES CONNECTED
            </span>
            <Barcode val="LOBBY-DISPATCH" h={18} color="var(--muted)" />
          </div>
        </div>

        {/* Global Nickname Picker (Required before hosting or joining) */}
        <div
          className="reveal-fade-up"
          style={{
            background: "#080A0D",
            border: "1px solid var(--border)",
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="jb" style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>
              YOUR PLAYER NAME:
            </span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="Enter your name..."
              style={{
                background: "var(--void)",
                border: "1px solid var(--border)",
                color: "var(--txt)",
                fontFamily: "var(--jb)",
                fontSize: 13,
                padding: "8px 14px",
                minWidth: 240,
                outline: "none",
              }}
            />
          </div>
          <div className="jb" style={{ fontSize: 10, color: "var(--muted)" }}>
            Tip: Pick a name from your group chat to see your custom lore persona!
          </div>
        </div>

        {/* If Not in Active Room: Show Host vs Join Setup */}
        {!activeRoom ? (
          <div>
            {/* Host / Join Tabs */}
            <div className="reveal-fade-up" style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              <button
                onClick={() => {
                  playClickSound();
                  setTab("host");
                }}
                style={{
                  background: tab === "host" ? "var(--chassis)" : "transparent",
                  border: `1px solid ${tab === "host" ? "var(--green)" : "var(--border)"}`,
                  color: tab === "host" ? "var(--green)" : "var(--muted)",
                  fontFamily: "var(--jb)",
                  fontSize: 11,
                  padding: "10px 24px",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  fontWeight: tab === "host" ? 700 : 400,
                }}
              >
                ● HOST A NEW ROOM
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setTab("join");
                }}
                style={{
                  background: tab === "join" ? "var(--chassis)" : "transparent",
                  border: `1px solid ${tab === "join" ? "var(--yellow)" : "var(--border)"}`,
                  color: tab === "join" ? "var(--yellow)" : "var(--muted)",
                  fontFamily: "var(--jb)",
                  fontSize: 11,
                  padding: "10px 24px",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  fontWeight: tab === "join" ? 700 : 400,
                }}
              >
                ● JOIN WITH ROOM CODE
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: "rgba(255,51,75,0.08)",
                  border: "1px solid var(--red)",
                  color: "var(--red)",
                  fontFamily: "var(--jb)",
                  fontSize: 11,
                  padding: "12px 16px",
                  marginBottom: 20,
                }}
              >
                {errorMessage}
              </div>
            )}

            {tab === "host" ? (
              /* HOST CONFIGURATION PANEL */
              <div
                className="reveal-fade-up"
                style={{
                  background: "var(--chassis)",
                  border: "1px solid var(--border)",
                  padding: "28px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 28,
                }}
              >
                {/* 1. Number of Rounds */}
                <div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 10,
                      color: "var(--green)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>1. NUMBER OF ROUNDS</span>
                    <span style={{ color: "var(--txt)", fontWeight: 700 }}>
                      {roundCount ? `${roundCount} RNDS` : "ENTER..."}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      background: "var(--void)",
                      border: "1px solid var(--border)",
                      height: 48,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", padding: "0 14px", flex: 1 }}>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={roundCount || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setRoundCount(Math.max(1, Math.min(30, val)));
                          } else {
                            setRoundCount(0);
                          }
                        }}
                        onBlur={() => {
                          if (!roundCount || roundCount < 1) setRoundCount(5);
                        }}
                        placeholder="5"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "var(--green)",
                          fontFamily: "var(--jb)",
                          fontSize: 16,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                      <span className="jb" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 700, marginLeft: 8 }}>
                        ROUNDS
                      </span>
                    </div>

                    {/* Custom Up / Down Stepper Arrows */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: 36,
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setRoundCount((prev) => Math.min(30, (prev || 1) + 1));
                        }}
                        title="Increment rounds (+1)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(57,255,20,0.15)";
                          e.currentTarget.style.color = "var(--green)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setRoundCount((prev) => Math.max(1, (prev || 1) - 1));
                        }}
                        title="Decrement rounds (-1)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(57,255,20,0.15)";
                          e.currentTarget.style.color = "var(--green)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div className="jb" style={{ fontSize: 9, color: "var(--muted)", marginTop: 8 }}>
                    Custom tournament: 1 to 30 rounds
                  </div>
                </div>

                {/* 2. Time Limit Per Question */}
                <div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 10,
                      color: "var(--green)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>2. TIME LIMIT PER QUESTION</span>
                    <span style={{ color: "var(--yellow)", fontWeight: 700 }}>
                      {timeLimitSeconds ? `${timeLimitSeconds}S` : "ENTER..."}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      background: "var(--void)",
                      border: "1px solid var(--border)",
                      height: 48,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", padding: "0 14px", flex: 1 }}>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={timeLimitSeconds || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setTimeLimitSeconds(Math.min(120, val));
                          } else {
                            setTimeLimitSeconds(0);
                          }
                        }}
                        onBlur={() => {
                          if (!timeLimitSeconds || timeLimitSeconds < 1) setTimeLimitSeconds(15);
                        }}
                        placeholder="15"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "var(--yellow)",
                          fontFamily: "var(--jb)",
                          fontSize: 16,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                      <span className="jb" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 700, marginLeft: 8 }}>
                        SECS
                      </span>
                    </div>

                    {/* Custom Up / Down Stepper Arrows */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: 36,
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setTimeLimitSeconds((prev) => Math.min(120, (prev || 15) + (prev && prev < 5 ? 1 : 5)));
                        }}
                        title="Increment time (+5s)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,208,0,0.15)";
                          e.currentTarget.style.color = "var(--yellow)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setTimeLimitSeconds((prev) => Math.max(1, (prev || 15) - (prev && prev <= 5 ? 1 : 5)));
                        }}
                        title="Decrement time (-5s)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,208,0,0.15)";
                          e.currentTarget.style.color = "var(--yellow)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div className="jb" style={{ fontSize: 9, color: "var(--muted)", marginTop: 8 }}>
                    Faster answers yield speed bonus points
                  </div>
                </div>

                {/* 3. Number of Target Players */}
                <div>
                  <div
                    className="jb"
                    style={{
                      fontSize: 10,
                      color: "var(--green)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>3. EXPECTED PLAYERS</span>
                    <span style={{ color: "var(--txt)", fontWeight: 700 }}>
                      {targetPlayers === 1 ? "SOLO" : `${targetPlayers || 1} PLAYERS`}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      background: "var(--void)",
                      border: "1px solid var(--border)",
                      height: 48,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", padding: "0 14px", flex: 1 }}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={targetPlayers || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setTargetPlayers(Math.max(1, Math.min(100, val)));
                          } else {
                            setTargetPlayers(0);
                          }
                        }}
                        onBlur={() => {
                          if (!targetPlayers || targetPlayers < 1) setTargetPlayers(4);
                        }}
                        placeholder="4"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "var(--txt)",
                          fontFamily: "var(--jb)",
                          fontSize: 16,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                      <span className="jb" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 700, marginLeft: 8 }}>
                        PLAYERS
                      </span>
                    </div>

                    {/* Custom Up / Down Stepper Arrows */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: 36,
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setTargetPlayers((prev) => Math.min(100, (prev || 1) + 1));
                        }}
                        title="Increment player count (+1)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(57,255,20,0.15)";
                          e.currentTarget.style.color = "var(--green)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setTargetPlayers((prev) => Math.max(1, (prev || 1) - 1));
                        }}
                        title="Decrement player count (-1)"
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(57,255,20,0.15)";
                          e.currentTarget.style.color = "var(--green)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div className="jb" style={{ fontSize: 9, color: "var(--muted)", marginTop: 8 }}>
                    Any device with the link can join
                  </div>
                </div>

                {/* 4. Game Mode Selection (Full Width) */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div
                    className="jb"
                    style={{
                      fontSize: 10,
                      color: "var(--green)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    4. SELECT ARCADE GAME MODE
                  </div>
                  <div
                    className="reveal-stagger-group"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {MODES.map((mode) => {
                      const isSelected = selectedMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            playClickSound();
                            setSelectedMode(mode.id);
                          }}
                          className="reveal-stagger-item"
                          style={{
                            background: isSelected ? "rgba(57,255,20,0.08)" : "var(--void)",
                            border: `1px solid ${isSelected ? "var(--green)" : "var(--border)"}`,
                            padding: "12px 14px",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            className="jb"
                            style={{
                              fontSize: 9,
                              color: isSelected ? "var(--green)" : "var(--muted)",
                              marginBottom: 4,
                            }}
                          >
                            {mode.badge}
                          </div>
                          <div
                            className="sg"
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: isSelected ? "var(--txt)" : "#AAA",
                              marginBottom: 4,
                            }}
                          >
                            {mode.title}
                          </div>
                          <div className="jb" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3 }}>
                            {mode.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat Upload Required Notice for Host */}
                {!hasUploadedChat && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      background: "rgba(255,208,0,0.08)",
                      border: "1px solid var(--yellow)",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="jb" style={{ color: "var(--yellow)", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="led led-y pulse-y" />
                        GROUP CHAT ARCHIVE REQUIRED (STEP 01)
                      </div>
                      <div className="jb" style={{ fontSize: 10, color: "var(--txt2)" }}>
                        You cannot host or compile a tournament without uploading your friend group chat log (.txt or .json).
                      </div>
                    </div>
                    {onGoToUpload && (
                      <button
                        type="button"
                        onClick={onGoToUpload}
                        className="btn-ghost"
                        style={{
                          fontSize: 10,
                          padding: "8px 16px",
                          borderColor: "var(--yellow)",
                          color: "var(--yellow)",
                          cursor: "pointer",
                        }}
                      >
                        ↑ GO TO STEP 01: UPLOAD CHAT
                      </button>
                    )}
                  </div>
                )}

                {/* Create Room Button */}
                <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                  <button
                    onClick={handleCreateRoom}
                    disabled={isProcessing || !hasUploadedChat}
                    className={hasUploadedChat ? "btn-green" : ""}
                    style={{
                      width: "100%",
                      padding: "16px",
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      cursor: !hasUploadedChat ? "not-allowed" : isProcessing ? "wait" : "pointer",
                      background: hasUploadedChat ? "var(--green)" : "rgba(255,208,0,0.06)",
                      color: hasUploadedChat ? "#000" : "var(--yellow)",
                      border: hasUploadedChat ? "none" : "1px solid var(--yellow)",
                      boxShadow: hasUploadedChat ? "0 0 24px rgba(57,255,20,0.3)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isProcessing
                      ? "INITIALIZING MULTIPLAYER ROOM..."
                      : !hasUploadedChat
                      ? "🔒 UPLOAD CHAT ARCHIVE IN STEP 01 TO HOST A ROOM"
                      : "GENERATE MULTIPLAYER ROOM CODE →"}
                  </button>
                </div>
              </div>
            ) : (
              /* JOIN ROOM PANEL */
              <div
                style={{
                  background: "var(--chassis)",
                  border: "1px solid var(--border)",
                  padding: "36px 28px",
                  maxWidth: 600,
                }}
              >
                <div
                  className="jb"
                  style={{
                    fontSize: 11,
                    color: "var(--yellow)",
                    letterSpacing: "0.1em",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="led led-y pulse-y" />
                  <span>ENTER ROOM CODE // PREFIX &quot;VYBZ-&quot; AUTO-ATTACHED</span>
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  {/* Fused Arcade Prefix & Suffix Input */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      flex: 1,
                      minWidth: 260,
                      background: "var(--void)",
                      border: "1px solid var(--yellow)",
                      boxShadow: "0 0 12px rgba(255,208,0,0.12)",
                    }}
                  >
                    {/* Fixed Non-Editable Autofilled VYBZ- Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px 16px",
                        background: "rgba(255,208,0,0.12)",
                        borderRight: "1px solid rgba(255,208,0,0.3)",
                        color: "var(--yellow)",
                        fontFamily: "var(--jb)",
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        userSelect: "none",
                      }}
                    >
                      VYBZ-
                    </div>

                    {/* Suffix Input */}
                    <input
                      type="text"
                      value={joinSuffix}
                      onChange={(e) => handleSuffixChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && joinSuffix.trim()) {
                          handleJoinRoom();
                        }
                      }}
                      placeholder="XXXX"
                      maxLength={4}
                      autoFocus={tab === "join"}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: "#FFFFFF",
                        fontFamily: "var(--jb)",
                        fontSize: 20,
                        fontWeight: 800,
                        letterSpacing: "0.22em",
                        padding: "12px 16px",
                        outline: "none",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    disabled={isProcessing || !joinSuffix.trim()}
                    className="btn-green"
                    style={{
                      padding: "0 28px",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      cursor: isProcessing || !joinSuffix.trim() ? "not-allowed" : "pointer",
                      opacity: !joinSuffix.trim() ? 0.6 : 1,
                    }}
                  >
                    {isProcessing ? "CONNECTING..." : "ENTER ROOM →"}
                  </button>
                </div>
                <p className="jb" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
                  Just type or paste the 4-character room suffix shown on the host device (e.g. 4829 or 7K4P). &quot;VYBZ-&quot; is automatically filled.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE ROOM LOBBY ROSTER & START CONTROLS */
          <div
            style={{
              background: "var(--chassis)",
              border: "1px solid var(--border)",
              padding: "28px",
            }}
          >
            {/* Top Exit / Disband Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid var(--border)",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onLeaveRoom?.();
                }}
                className="jb"
                style={{
                  background: "rgba(255,51,75,0.08)",
                  border: "1px solid var(--red)",
                  color: "var(--red)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--red)";
                  e.currentTarget.style.color = "#000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,51,75,0.08)";
                  e.currentTarget.style.color = "var(--red)";
                }}
              >
                <span>←</span>
                <span>{isHost ? "DISBAND ROOM // GO BACK TO MAIN PAGE" : "LEAVE ROOM // RETURN TO MAIN PAGE"}</span>
              </button>

              <div className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
                {isHost
                  ? "Created by mistake? Click to return to setup and join a room instead."
                  : "Need to leave? Click to return to main menu."}
              </div>
            </div>

            {/* Room Banner & Share Link */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 20,
                borderBottom: "1px solid var(--border)",
                paddingBottom: 20,
                marginBottom: 24,
              }}
            >
              <div>
                <div className="jb" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em" }}>
                  SHARE THIS CODE WITH PLAYERS ON ANY DEVICE:
                </div>
                <div
                  className="jb"
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    color: "var(--green)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {activeRoom.roomCode || activeRoom.code}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  onClick={handleCopyLink}
                  className="btn-ghost"
                  style={{
                    fontSize: 11,
                    padding: "10px 18px",
                    cursor: "pointer",
                  }}
                >
                  {copiedLink ? "✔ LINK COPIED!" : "COPY DIRECT GAME LINK"}
                </button>
                <div
                  className="jb"
                  style={{
                    fontSize: 11,
                    background: "rgba(57,255,20,0.06)",
                    border: "1px solid var(--green)",
                    color: "var(--green)",
                    padding: "10px 16px",
                  }}
                >
                  {activeRoom.settings?.roundCount ?? activeRoom.totalQuestions ?? 5} ROUNDS • {activeRoom.settings?.timeLimitSeconds ?? 15}S TIMER
                </div>
              </div>
            </div>

            {/* Connected Devices Roster */}
            <div style={{ marginBottom: 28 }}>
              <div
                className="jb"
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>CONNECTED PLAYERS ({activeRoom.players.length})</span>
                <span>STATUS: {activeRoom.status}</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {activeRoom.players.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      background: p.id === playerId ? "rgba(57,255,20,0.05)" : "var(--void)",
                      border: `1px solid ${p.id === playerId ? "var(--green)" : "var(--border)"}`,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span className="jb" style={{ fontSize: 9, color: "var(--muted)" }}>
                        {p.isHost ? "★ HOST" : "PLAYER"}
                      </span>
                      <span className="led led-g pulse-g" />
                    </div>
                    <div
                      className="sg"
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--txt)",
                        marginBottom: 2,
                      }}
                    >
                      {p.name} {p.id === playerId && "(YOU)"}
                    </div>
                    <div className="jb" style={{ fontSize: 9, color: "var(--yellow)" }}>
                      {p.tag}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Launch or Waiting for Host */}
            <div>
              {isHost ? (
                <div>
                  <button
                    onClick={() => {
                      playClickSound();
                      onStartMatch();
                    }}
                    className="btn-green"
                    style={{
                      width: "100%",
                      padding: "18px 24px",
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      cursor: "pointer",
                    }}
                  >
                    START MATCH ON ALL CONNECTED DEVICES →
                  </button>

                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onLeaveRoom?.();
                      }}
                      className="jb"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        fontSize: 10,
                        cursor: "pointer",
                        textDecoration: "underline",
                        letterSpacing: "0.06em",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--txt)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      Created this room by accident? Disband room &amp; return to Join / Setup
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(255,208,0,0.06)",
                    border: "1px solid var(--yellow)",
                    padding: "16px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    className="jb"
                    style={{
                      fontSize: 12,
                      color: "var(--yellow)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <span className="led led-y pulse-y" />
                    CONNECTED TO HOST // WAITING FOR HOST TO START ROUND 01...
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onLeaveRoom?.();
                      }}
                      className="jb"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        fontSize: 10,
                        cursor: "pointer",
                        textDecoration: "underline",
                        letterSpacing: "0.06em",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--txt)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      Joined by accident? Leave this room &amp; return to main page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
