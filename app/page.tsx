"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  scrambleText,
  triggerGlitchSlice,
} from "@/lib/motion";
import { apiClient } from "@/lib/api-client";
import { Barcode } from "@/components/ui/Barcode";
import { CrtOverlay } from "@/components/ui/CrtOverlay";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { VybzBootScreen } from "@/components/ui/VybzBootScreen";
import { ArcadeFooter } from "@/components/ui/ArcadeFooter";
import { RetroGlitchHeadline } from "@/components/ui/RetroGlitchHeadline";
import { HeroInteractiveBackground } from "@/components/ui/HeroInteractiveBackground";
import { CHAT_PRESETS } from "@/lib/mock-data/chat-presets";
import { DocumentSelector } from "@/components/sections/DocumentSelector";
import { MatchConfigLobby } from "@/components/sections/MatchConfigLobby";
import { TriviaArena } from "@/components/sections/TriviaArena";
import { LeaderboardPodium } from "@/components/sections/LeaderboardPodium";
import { ArcadeOptionKey } from "@/types/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── RETRO 8-BIT SOUND ENGINE ────────────────────────────────────────────────
class SndEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  init() {
    try {
      if (!this.ctx && typeof window !== "undefined") {
        const A =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (A) this.ctx = new A();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => { });
      }
    } catch {
      // Insecure context or browser restrictions
    }
  }

  tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.1) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        freq * 0.5,
        this.ctx.currentTime + dur
      );
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch {
      /**/
    }
  }

  click() {
    try {
      this.tone(1200, 0.04, "square", 0.08);
    } catch { }
  }

  coin() {
    try {
      this.tone(987, 0.12, "square", 0.14);
      setTimeout(() => {
        try { this.tone(1318, 0.35, "square", 0.18); } catch { }
      }, 100);
    } catch { }
  }

  success() {
    try {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => {
          try { this.tone(f, 0.22, "triangle", 0.14); } catch { }
        }, i * 75)
      );
    } catch { }
  }

  error() {
    try {
      this.tone(140, 0.32, "sawtooth", 0.18);
    } catch { }
  }
}

const snd = new SndEngine();

export default function VybzMainPage() {
  // ── LOCAL PLAYER IDENTITY ────────────────────────────────────────────────
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [coins, setCoins] = useState<number>(2);
  const [muted, setMuted] = useState<boolean>(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("hero");
  const [telemetryStatus, setTelemetryStatus] = useState<string>("● ONLINE");

  // ── GAME STATE ───────────────────────────────────────────────────────────
  const [hasUploadedCustomChat, setHasUploadedCustomChat] = useState<boolean>(false);
  const [selectedChat, setSelectedChat] = useState<{
    sessionId?: string;
    title: string;
    participants: string[];
    topQuotes: any[];
    rawText: string;
    isCustomUpload?: boolean;
  }>({
    title: CHAT_PRESETS[0].title,
    participants: CHAT_PRESETS[0].participants,
    topQuotes: CHAT_PRESETS[0].topQuotes,
    rawText: CHAT_PRESETS[0].rawChatText,
    isCustomUpload: false,
  });

  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [bootKey, setBootKey] = useState<number>(0);
  const [isBootActive, setIsBootActive] = useState<boolean>(true);

  // DOM Refs for animations
  const heroTaglineRef = useRef<HTMLDivElement>(null);
  const heroSubRef = useRef<HTMLDivElement>(null);
  const navCoinBtnRef = useRef<HTMLButtonElement>(null);

  // Initialize player ID & restore persisted name from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    let pid = localStorage.getItem("vybz_player_id");
    if (!pid) {
      pid = `player_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("vybz_player_id", pid);
    }
    setPlayerId(pid);

    const savedName = localStorage.getItem("vybz_player_name");
    if (savedName && savedName !== "Nishant") {
      setPlayerName(savedName);
    } else if (savedName === "Nishant") {
      localStorage.removeItem("vybz_player_name");
      setPlayerName("");
    }

    // 1. Detect if this is a page reload/refresh
    const navEntries =
      typeof performance !== "undefined"
        ? performance.getEntriesByType("navigation")
        : [];
    const isReload =
      (navEntries.length > 0 &&
        (navEntries[0] as PerformanceNavigationTiming).type === "reload") ||
      (typeof window !== "undefined" &&
        (window.performance as any)?.navigation?.type === 1);

    const wasInRoomOnReload =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("vybz_in_room") === "true";

    // Check for room code query param in URL (?room=VYBZ-XXXX or ?room=XXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    // If user refreshed the page while being in a room (or reloaded with ?room param),
    // redirect them cleanly back to the landing page
    if (isReload && (wasInRoomOnReload || Boolean(roomParam))) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("vybz_in_room");
        sessionStorage.removeItem("vybz_room_code");
      }
      if (typeof window !== "undefined") {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual";
        }
        window.history.replaceState({}, "", window.location.pathname);
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }, 50);
      }
      setIsBootActive(false);
      setActiveRoom(null);
      setTelemetryStatus("● ONLINE");
    } else if (roomParam) {
      const codeToFetch = roomParam.toUpperCase().startsWith("VYBZ-")
        ? roomParam.toUpperCase()
        : `VYBZ-${roomParam.toUpperCase()}`;
      apiClient
        .getRoom(codeToFetch, pid)
        .then((room) => {
          setActiveRoom(room);
          setTelemetryStatus(`● ROOM: ${room.roomCode || room.code}`);
        })
        .catch(() => {
          console.log("Room query param could not be joined automatically.");
        });
    }
  }, []);

  // Update playerName in state & localStorage
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("vybz_player_name", name);
    }
  };

  // Toggle audio sound engine
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    snd.muted = next;
    if (!next) snd.click();
  };

  // Insert arcade coin credits
  const insertCoin = () => {
    snd.coin();
    setCoins((c) => c + 1);
    if (navCoinBtnRef.current) triggerGlitchSlice(navCoinBtnRef.current, 0.2);
  };

  // Smooth scroll helper
  const scrollTo = (id: string) => {
    snd.click();
    let targetId = id;
    if (id === "section-lobby" && isMatchActive) {
      targetId = "section-trivia-arena";
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ── REAL-TIME MULTIPLAYER SYNCHRONIZATION (DATABASE-BACKED POLLING) ─────
  useEffect(() => {
    const roomIdentifier =
      activeRoom?.roomId || activeRoom?.id || activeRoom?.roomCode || activeRoom?.code;
    if (!roomIdentifier || !playerId) return;

    const isFinished =
      activeRoom?.status === "FINISHED" || activeRoom?.status === "MATCH_OVER";
    const intervalMs = isFinished ? 4000 : 800;

    const pollInterval = setInterval(async () => {
      try {
        const freshState = await apiClient.getRoom(roomIdentifier, playerId);
        setActiveRoom((prev: any) => {
          if (prev?.status !== freshState.status) {
            if (freshState.status === "QUESTION") {
              snd.click();
            } else if (freshState.status === "RESULTS") {
              const myAns = freshState.players?.find(
                (p: any) => p.userId === playerId || p.id === playerId
              )?.lastAnswer;
              if (myAns?.isCorrect) {
                snd.success();
              } else {
                snd.error();
              }
            } else if (freshState.status === "FINISHED") {
              snd.coin();
            }
          }
          return freshState;
        });

        if (freshState.status === "FINISHED") {
          setTelemetryStatus("● TOURNAMENT CONCLUDED");
        } else if (
          freshState.status === "QUESTION" ||
          freshState.status === "RESULTS"
        ) {
          setTelemetryStatus(`● PLAYING ROUND 0${(freshState.currentQuestionIndex ?? 0) + 1}`);
        } else {
          setTelemetryStatus(`● ROOM: ${freshState.roomCode || freshState.code}`);
        }
      } catch {
        // Non-fatal polling error
      }
    }, intervalMs);

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    activeRoom?.roomId,
    activeRoom?.id,
    activeRoom?.roomCode,
    activeRoom?.code,
    activeRoom?.status,
    playerId,
  ]);

  // Track active room in sessionStorage & handle beforeunload / pagehide
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeRoom) {
      sessionStorage.setItem("vybz_in_room", "true");
      const rCode = activeRoom.roomCode || activeRoom.code;
      if (rCode) sessionStorage.setItem("vybz_room_code", rCode);
    } else {
      sessionStorage.removeItem("vybz_in_room");
      sessionStorage.removeItem("vybz_room_code");
    }

    const handleBeforeUnload = () => {
      if (activeRoom) {
        sessionStorage.setItem("vybz_in_room", "true");
        const rId =
          activeRoom.roomId ||
          activeRoom.id ||
          activeRoom.roomCode ||
          activeRoom.code;
        if (rId && playerId && typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(
            `/api/rooms/${encodeURIComponent(rId)}/leave`,
            JSON.stringify({ userId: playerId })
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [activeRoom, playerId]);

  const handleBootComplete = () => {
    setIsBootActive(false);
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  };

  // Replay boot sequence cleanly without full page refresh
  const handleReboot = () => {
    snd.coin();
    const rId =
      activeRoom?.roomId || activeRoom?.id || activeRoom?.roomCode || activeRoom?.code;
    if (rId && playerId) {
      apiClient.leaveRoom(rId, playerId).catch(() => {});
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("vybz_in_room");
      sessionStorage.removeItem("vybz_room_code");
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    setActiveRoom(null);
    setTelemetryStatus("● ONLINE");
    setIsBootActive(true);
    setBootKey((k) => k + 1);
  };

  // ── USER GAMEPLAY ACTIONS ────────────────────────────────────────────────
  const handleRoomCreatedOrJoined = (room: any) => {
    snd.success();
    setActiveRoom(room);
    const code = room.roomCode || room.code;
    setTelemetryStatus(`● ROOM: ${code}`);

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("vybz_in_room", "true");
      sessionStorage.setItem("vybz_room_code", code);
    }

    // Update URL query string without page reload
    if (typeof window !== "undefined") {
      const newUrl = `${window.location.pathname}?room=${code}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    }

    // Scroll to lobby section
    setTimeout(() => scrollTo("section-lobby"), 100);
  };

  // Leave active room and return cleanly to main landing state
  const handleLeaveRoom = () => {
    snd.click();
    const rId =
      activeRoom?.roomId || activeRoom?.id || activeRoom?.roomCode || activeRoom?.code;
    if (rId && playerId) {
      apiClient.leaveRoom(rId, playerId).catch(() => {});
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("vybz_in_room");
      sessionStorage.removeItem("vybz_room_code");
    }
    setActiveRoom(null);
    setTelemetryStatus("● ONLINE");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", window.location.pathname);
    }
    scrollTo("section-hero");
  };

  const handleStartMatch = async () => {
    if (!activeRoom) return;
    if (!hasUploadedCustomChat) {
      alert("⚠️ UPLOAD REQUIRED: Please upload your group chat .txt or .json file in Step 01 before starting the match.");
      scrollTo("section-document");
      return;
    }
    const rId = activeRoom.roomId || activeRoom.id || activeRoom.roomCode || activeRoom.code;
    try {
      const room = await apiClient.startMatch(rId, playerId);
      setActiveRoom(room);
      snd.coin();
      scrollTo("section-trivia-arena");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to start match.");
    }
  };

  const handleSelectOption = async (key: ArcadeOptionKey, questionId?: string) => {
    if (!activeRoom) return;
    const rId = activeRoom.roomId || activeRoom.id || activeRoom.roomCode || activeRoom.code;
    const currentQ = activeRoom.currentQuestion || activeRoom.activeQuestion;
    const targetQId = questionId || currentQ?.id;
    if (!targetQId) return;

    try {
      await apiClient.submitRoomAnswer(rId, {
        userId: playerId,
        questionId: targetQId,
        selectedAnswer: key,
        responseTimeMs: 1500,
      });
      const refreshed = await apiClient.getRoom(rId, playerId);
      setActiveRoom(refreshed);
    } catch (err: any) {
      console.error("Answer submit error:", err);
    }
  };

  const handleAdvanceQuestion = async () => {
    if (!activeRoom) return;
    const rId = activeRoom.roomId || activeRoom.id || activeRoom.roomCode || activeRoom.code;
    try {
      const room = await apiClient.advanceQuestion(rId, playerId);
      setActiveRoom(room);
      snd.click();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResetMatch = async () => {
    if (!activeRoom) return;
    try {
      let sessionId = selectedChat.sessionId;
      if (!sessionId) {
        const ingestRes = await apiClient.ingestChat(selectedChat.rawText, selectedChat.title);
        sessionId = ingestRes.sessionId;
      }
      const gameRes = await apiClient.generateGame({
        sessionId,
        rom: "ROM // 001: WHO SAID IT?",
        questionCount: 5,
        userId: playerId,
      });
      const roomRes = await apiClient.createRoom({
        gameId: gameRes.gameId,
        hostUserId: playerId,
        displayName: playerName.trim(),
      });
      const room = await apiClient.getRoom(roomRes.roomId, playerId);
      setActiveRoom(room);
      snd.coin();
      scrollTo("section-lobby");
    } catch (err: any) {
      console.error(err);
    }
  };

  // Determine if Arena should be displayed
  const isMatchActive =
    activeRoom &&
    (activeRoom.status === "QUESTION" ||
      activeRoom.status === "RESULTS" ||
      activeRoom.status === "QUESTION_ACTIVE" ||
      activeRoom.status === "QUESTION_REVEAL");

  const isMatchOver =
    activeRoom &&
    (activeRoom.status === "FINISHED" || activeRoom.status === "MATCH_OVER");

  // ── MINIMALISTIC SCROLL-TRIGGERED ENTRANCE ANIMATIONS ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let ctx: gsap.Context | null = null;
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        // 1. Single Element Gentle Flowy Slide-In (y: 32 -> 0, opacity: 0 -> 1)
        const fadeUps = document.querySelectorAll(".reveal-fade-up");
        fadeUps.forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: "power3.out",
              overwrite: "auto",
              scrollTrigger: {
                trigger: el,
                start: "top 90%",
                end: "bottom top",
                toggleActions: "play reverse play reverse",
              },
            }
          );
        });

        // 2. Staggered Groups (flowy cascading entrance, y: 26 -> 0)
        const staggerGroups = document.querySelectorAll(".reveal-stagger-group");
        staggerGroups.forEach((group) => {
          const items = group.querySelectorAll(".reveal-stagger-item");
          if (items.length > 0) {
            gsap.fromTo(
              items,
              { opacity: 0, y: 26 },
              {
                opacity: 1,
                y: 0,
                duration: 0.75,
                stagger: {
                  each: 0.07,
                  ease: "power1.out",
                },
                ease: "power3.out",
                overwrite: "auto",
                scrollTrigger: {
                  trigger: group,
                  start: "top 88%",
                  end: "bottom top",
                  toggleActions: "play reverse play reverse",
                },
              }
            );
          }
        });

        // 3. Dynamic Section Spy for Telemetry Header (updates active section on scroll down & up)
        const sections = [
          { id: "hero", el: document.getElementById("hero") },
          { id: "section-document", el: document.getElementById("section-document") },
          { id: "section-lobby", el: document.getElementById("section-lobby") || document.getElementById("section-trivia-arena") },
          { id: "section-leaderboard", el: document.getElementById("section-leaderboard") },
        ];

        sections.forEach(({ id, el }) => {
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: "top 45%",
            end: "bottom 45%",
            onEnter: () => setActiveSectionId(id),
            onEnterBack: () => setActiveSectionId(id),
          });
        });
      });
    }, 120);

    return () => {
      clearTimeout(timer);
      if (ctx) ctx.revert();
    };
  }, [isMatchActive, isMatchOver, selectedChat]);

  return (
    <div
      style={{
        background: "var(--void)",
        color: "var(--txt)",
        fontFamily: "var(--sg)",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Cinematic Retro-Futuristic Arcade Boot Screen */}
      {isBootActive && (
        <VybzBootScreen
          key={bootKey}
          onComplete={handleBootComplete}
        />
      )}

      <div className="vignette" />
      <CrtOverlay />
      <CustomCursor />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER NAV & TELEMETRY HUD
      ═══════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          background: "rgba(10,11,13,0.96)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          {/* Micro Telemetry Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid var(--border)",
              fontFamily: "var(--jb)",
              fontSize: 9,
              color: "var(--muted)",
              letterSpacing: "0.1em",
            }}
          >
            <span>┌ VYBZ ARCADE ENGINE // TERMINAL 01</span>
            <span style={{ display: "flex", gap: 16 }}>
              <span>FREQ: 60Hz</span>
              <span>SYNCHRONIZED MULTIPLAYER</span>
              <span style={{ color: "var(--green)" }}>PHOSPHOR: ACTIVE └</span>
            </span>
          </div>

          {/* Main Nav Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Brand Logo */}
            <button
              onClick={() => scrollTo("hero")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--sg)",
                  fontWeight: 800,
                  fontSize: 20,
                  letterSpacing: "-0.04em",
                  color: "var(--green)",
                }}
              >
                VYBZ
              </span>
              <span className="jb" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em" }}>
                SYSTEM 01.04
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="led led-g pulse-g" />
                <span className="jb" style={{ fontSize: 9, color: "var(--green)" }}>
                  {telemetryStatus}
                </span>
              </span>
            </button>

            {/* Quick Section Jump Navigation */}
            <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[
                ["section-document", "01 // CHAT LORE"],
                [!isMatchActive ? "section-lobby" : "section-trivia-arena", !isMatchActive ? "02 // MULTIPLAYER LOBBY" : "02 // TRIVIA ARENA"],
                ...(isMatchOver ? [["section-leaderboard", "03 // LEADERBOARD"]] : []),
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="jb"
                  style={{
                    background: "none",
                    border: `1px solid ${activeSectionId === id ? "var(--green)" : "var(--border)"}`,
                    color: activeSectionId === id ? "var(--green)" : "var(--muted)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Audio Mute & Coin Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={toggleMute}
                className="jb"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: muted ? "var(--red)" : "var(--muted)",
                  fontSize: 9,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                {muted ? "AUDIO: OFF" : "AUDIO: 8-BIT"}
              </button>

              <button
                ref={navCoinBtnRef}
                onClick={insertCoin}
                className="jb"
                style={{
                  background: "rgba(255,208,0,0.08)",
                  border: "1px solid var(--yellow)",
                  color: "var(--yellow)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🪙</span>
                <span>CREDITS: {coins}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          00 // STREAMLINED CYBERPUNK HERO SECTION
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          minHeight: "80vh",
          paddingTop: 120,
          paddingBottom: 40,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderBottom: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(ellipse at 50% 30%, rgba(57,255,20,0.04) 0%, transparent 70%)",
        }}
      >
        {/* Immersive Mouse-Interactive Arcade Background */}
        <HeroInteractiveBackground />

        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", width: "100%", position: "relative", zIndex: 10 }}>
          <div style={{ maxWidth: 980 }}>
            <div
              className="jb"
              style={{
                fontSize: 11,
                color: "var(--green)",
                letterSpacing: "0.2em",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="led led-g pulse-g" />
              RETRO ARCADE MACHINE // TOURNAMENT EDITION
            </div>

            <RetroGlitchHeadline
              text="YOUR CHATS BECOME GAMES."
              triggerEntrance={!isBootActive}
              style={{
                fontSize: "clamp(48px, 8vw, 108px)",
                fontWeight: 800,
                letterSpacing: "-0.05em",
                lineHeight: 0.9,
                color: "var(--txt)",
              }}
            />

            <p
              ref={heroSubRef}
              className="jb"
              style={{
                fontSize: "clamp(13px, 1.4vw, 16px)",
                color: "var(--muted)",
                lineHeight: 1.6,
                maxWidth: 720,
                marginBottom: 36,
              }}
            >
              Select your group chat lore, configure tournament rounds, and host a live multiplayer room where every phone and laptop plays the same trivia simultaneously.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => scrollTo("section-document")}
                className="btn-green"
                style={{
                  padding: "16px 32px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  cursor: "pointer",
                }}
              >
                1. CHOOSE CHAT ARCHIVE ↓
              </button>

              <button
                onClick={() => scrollTo("section-lobby")}
                className="btn-ghost"
                style={{
                  padding: "16px 28px",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                }}
              >
                2. JOIN WITH CODE →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          01 // PRIMARY HIGHLIGHT: DOCUMENT SELECTION
      ═══════════════════════════════════════════════════════════════════ */}
      <DocumentSelector
        hasUploadedChat={hasUploadedCustomChat}
        onSelectChat={(chat) => {
          setSelectedChat(chat);
          if (chat.isCustomUpload) {
            setHasUploadedCustomChat(true);
          }
        }}
        onScrollToSetup={() => scrollTo("section-lobby")}
        playClickSound={() => snd.click()}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          02 // MULTIPLAYER HOSTING & GAME CONFIGURATION LOBBY / TRIVIA ARENA
      ═══════════════════════════════════════════════════════════════════ */}
      {!isMatchActive && !isMatchOver && (
        <MatchConfigLobby
          chatLore={selectedChat}
          activeRoom={activeRoom}
          playerId={playerId}
          playerName={playerName}
          hasUploadedChat={hasUploadedCustomChat}
          onGoToUpload={() => scrollTo("section-document")}
          onPlayerNameChange={handlePlayerNameChange}
          onRoomCreatedOrJoined={handleRoomCreatedOrJoined}
          onStartMatch={handleStartMatch}
          onLeaveRoom={handleLeaveRoom}
          playClickSound={() => snd.click()}
        />
      )}

      {/* Primary Highlight: Trivia Arena replaces Lobby in place when match is active */}
      {isMatchActive && (
        <TriviaArena
          roomState={activeRoom}
          playerId={playerId}
          onSelectOption={handleSelectOption}
          onAdvanceQuestion={handleAdvanceQuestion}
          playClickSound={() => snd.click()}
          playSuccessSound={() => snd.success()}
          playErrorSound={() => snd.error()}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          04 // POST-MATCH LEADERBOARD ("WHO KNOWS THE GC THE BEST")
      ═══════════════════════════════════════════════════════════════════ */}
      {isMatchOver && (
        <LeaderboardPodium
          roomState={activeRoom}
          playerId={playerId}
          onResetMatch={handleResetMatch}
          onNewChat={() => {
            const rId =
              activeRoom?.roomId || activeRoom?.id || activeRoom?.roomCode || activeRoom?.code;
            if (rId && playerId) {
              apiClient.leaveRoom(rId, playerId).catch(() => {});
            }
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.removeItem("vybz_in_room");
              sessionStorage.removeItem("vybz_room_code");
            }
            if (typeof window !== "undefined") {
              window.history.pushState({}, "", window.location.pathname);
            }
            setActiveRoom(null);
            setTelemetryStatus("● ONLINE");
            scrollTo("section-document");
          }}
          playClickSound={() => snd.click()}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER // ARCADE SYSTEM SHUTDOWN & ARCHIVE TERMINAL
      ═══════════════════════════════════════════════════════════════════ */}
      <ArcadeFooter
        onReboot={handleReboot}
        playClickSound={() => snd.click()}
        playCoinSound={() => snd.coin()}
      />
    </div>
  );
}
