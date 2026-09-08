# VYBZ // Frontend Audit & Entity Mapping
## Comprehensive Architectural Audit of the Existing VYBZ Frontend

**Audit Date**: September 2026  
**Auditor**: Antigravity Assistant  
**Source File**: `app/page.tsx` (4,651 lines) and `components/`  

---

## 1. Executive Summary
The VYBZ frontend is a cyberpunk, brutalist retro-arcade experience styled with phosphor CRT scanlines, custom GSAP cursor tracking, magnetic buttons, Web Audio API 8-bit sound synthesis, and pinned scroll animations.

The visual identity must be **100% preserved**. The objective of this audit is to identify every entity, state variable, interaction, cartridge mode, score system, loading state, and API expectation so that the new OpenAI-powered backend can connect seamlessly.

---

## 2. Entity Mapping Table

| Entity | Purpose in UI | Current / Initial Data | Expected Backend Data | API Route Required | State Variable(s) | Notes |
|---|---|---|---|---|---|---|
| **Header Nav & Telemetry** | Global machine status HUD, clock, audio toggle, coin counter | `telemetryStatus`: "● ONLINE"<br>`coins`: 2 | Live engine state e.g. "● OPENAI // READY" | None (local state + responses) | `telemetryStatus`, `coins`, `muted` | Coins increment on click; audio triggers 8-bit tone. |
| **Section 01: Boot Hero** | CRT power-on scramble reveal of "YOUR CHATS." and "BECOME GAMES." | Static typography & GSAP timeline | None | None | `bootStatusRef`, `chatsRef`, `gamesRef` | Pure visual hero presentation with magnetic buttons. |
| **Section 02: Input & Convergence** | Displays detected chat fragments & thermal receipt preview | Mock fragments: "Nishant: guys are we...", "TRANS: #99482" | Real message counts & detected top phrases | `POST /api/chat/ingest` | `patternFoundRef` | Thermal receipt shows message counts & top detected phrase. |
| **Section 03: Data Port** | File upload drop zone (.txt, .json, .csv) & ingestion terminal | Simulated progress: 0 to 4 (`uploadStage`) | Real `ChatSession`: `sessionId`, `participants`, `messageCount`, `topQuotes` | `POST /api/chat/ingest` | `uploadStage`, `isUploading`, `uploadStatusText`, `activeStreamName` | Upload stages: 1=INGESTING, 2=PARSING, 3=ANALYZING, 4=READY. |
| **Section 04: AI Core** | 6-stage scroll-pinned machine visualization | Stages: SCANNING, PARSING, IDENTIFYING, MAPPING, GENERATING, GAME READY | AI Analysis context (topics, dynamics, jokes) | Handled during ingestion & game generation | `aiStageBadgeRef`, `aiGeneratedFlashRef` | Scrubbed via GSAP ScrollTrigger. |
| **Section 05: Transformation** | Pinned before/after comparison of raw chat snippet vs arcade game card | Static Alex/Maya chat excerpt | First question of active ROM | None (presentation) | `rawPanelRef`, `gamePanelRef`, `arrowNodeRef` | Visual bridge demonstrating chat-to-game mechanic. |
| **Section 06: Arcade Shelf** | 5 interactive cartridges: ROM 001–005 | ROM 001 (WHO SAID IT), ROM 002 (MEMORY BANK), ROM 003 (FRIENDSHIP QUIZ), ROM 004 (HOT TAKE MACHINE), ROM 005 (CHAOS MODE) | Generates new question set tailored to active ROM and player profile | `POST /api/game/generate` | `activeCart` (0 to 4), `cartridgeDomRefs` | Clicking a cartridge mounts the ROM and requests new questions. |
| **Section 07: Live Game Bench** | Playable arcade cabinet with quote, prompt, 4 options (A/B/C/D), score, timer | Default hardcoded question | `ArcadeQuestion[]` from backend with `sourceMessageIds` and `sourceAuthor` | `POST /api/game/generate`<br>`POST /api/game/answer`<br>`POST /api/game/complete` | `questions`, `currentQIndex`, `selectedAns`, `answerState`, `score`, `gameId` | Selecting an answer calls answer API. Correct adds +500 pts. NEXT advances question. Final triggers completion. |
| **Game Master Alert Banner** | Cabinet HUD banner displaying dynamic AI arbiter feedback | Hardcoded string banner | `action` (`BONUS_ROUND`, `GAME_END`, `NEXT_QUESTION`) & `message` | `POST /api/game/complete` / Game Master | `gameMasterBanner` | Displays arcade banner e.g. "BONUS ROUND // HEURISTIC CORE MULTIPLIER". |
| **Section 08: Adaptive Memory** | Displays group dynamics, participant affinities, and memory vectors | Hardcoded list of 4 players with mock percentages (94%, 88%, 72%) | Real `PlayerProfile` from backend with strong/weak areas & affinities | `GET /api/profile` | `participants`, `inferredInterests`, `profileBarRef` | Dynamically renders participants detected from chat. |
| **Section 09: Memory Bank Receipt** | Thermal receipt of lore vectors and persistent memory | Static receipts | Persistent session and game summary | `GET /api/profile` | Thermal receipt DOM | Shows persistent games played, accuracy, and strong/weak topics. |
| **Section 10–13: Machine Loop & Final CTA** | Architectural loop diagram, status telemetry, and final insert-coin CTA | Static branding | Machine status | None | `finalSectionRef`, `finalCoinBtnRef` | Smooth scroll jump buttons and coin insertion. |

---

## 3. Detailed State Inventory in `app/page.tsx`

| State Variable | Type | Current Purpose | Proposed New Role |
|---|---|---|---|
| `coins` | `number` | Credit counter (increments on INSERT COIN) | Unchanged (interactive arcade feel) |
| `muted` | `boolean` | Web Audio sound toggle | Unchanged |
| `answerState` | `null \| "correct" \| "wrong"` | Visual state of current answer feedback | Set directly from server-authoritative `/api/game/answer` response |
| `selectedAns` | `string \| null` | Currently clicked option key ('A', 'B', 'C', 'D') | Sent in body to `/api/game/answer` |
| `score` | `number` | Total player score in cabinet | Updated directly from `totalScore` returned by `/api/game/answer` |
| `activeCart` | `number` | Index (0–4) of selected ROM cartridge | Maps to `ROM_001` through `ROM_005` in `/api/game/generate` |
| `uploadStage` | `number` | Ingestion stage indicator (0=IDLE, 1=INGESTING, 2=PARSING, 3=ANALYZING, 4=READY) | Driven by real progress through `/api/chat/ingest` and `/api/game/generate` |
| `telemetryStatus` | `string` | Top bar LED indicator | Displays `● OPENAI // ACTIVE` or `● OPENAI // READY` |
| `activeSectionId` | `string` | Tracks active scroll section | Unchanged (ScrollTrigger indicator) |
| `questions` | `ArcadeQuestion[]` | Current set of generated questions | Loaded from `POST /api/game/generate` |
| `currentQIndex` | `number` | Index of active question | Incremented on NEXT; triggers `/api/game/complete` when `currentQIndex >= questions.length - 1` |
| `participants` | `string[]` | Ingested group participant names | Populated from `POST /api/chat/ingest` and `GET /api/profile` |
| `inferredInterests` | `string[]` | Analyzed conversation themes | Populated from `analysis.interests` in `POST /api/chat/ingest` |
| `extractedQuotes` | `string[]` | Extracted top quotes for display | Populated from `topQuotes` in `POST /api/chat/ingest` |
| `activeStreamName` | `string` | Filename of uploaded chat file | Updated on file drop/select |
| `isUploading` | `boolean` | Upload progress lock | Disables drop area during processing |
| `uploadStatusText` | `string` | Display label during upload | Shows "INGESTING...", "ANALYZING...", "READY //" |
| `gameMasterBanner` | `string \| null` | Alert text from AI Game Master | Set on game completion or special event |
| **`sessionId` (NEW)** | `string \| null` | Persistent server-side ChatSession ID | Returned by `/api/chat/ingest`, passed to `/api/game/generate` |
| **`gameId` (NEW)** | `string \| null` | Current GameSession ID | Returned by `/api/game/generate`, passed to `/api/game/answer` and `/api/game/complete` |
| **`playerProfile` (NEW)** | `PlayerProfile \| null` | Current persistent player profile | Loaded via `GET /api/profile` and updated after games |

---

## 4. API Endpoints Required

```
1. POST /api/chat/ingest
   - Input: FormData (file) or JSON ({ rawText, fileName })
   - Output: { sessionId, participants, messageCount, messages, topQuotes, sampleSnippets, analysis }

2. POST /api/game/generate
   - Input: { sessionId, rom: "ROM_001", questionCount: 5, playerId: "demo-player" }
   - Output: { gameId, rom, questions: ArcadeQuestion[] }

3. POST /api/game/answer
   - Input: { gameId, questionId, selectedAnswer: "B", responseTimeMs: 2450 }
   - Output: { correct: boolean, correctAnswer: "B", scoreDelta: 500, totalScore: 1500, feedback: string }

4. POST /api/game/complete
   - Input: { gameId }
   - Output: { gameId, finalScore, accuracy, profileUpdate, gameMasterEvent: { action, message } }

5. GET /api/profile?playerId=demo-player
   - Output: PlayerProfile (gamesPlayed, averageScore, accuracy, strongAreas, weakAreas, answerHistory)
```

---

## 5. UI Preservation Guarantee
None of the following files or components will be redesigned, simplified, or altered visually:
- `app/globals.css` (CRT lines, phosphor neon styling, scanlines)
- `lib/motion.ts` (GSAP timeline helpers, glitch triggers, scramble text)
- `components/ui/Barcode.tsx`
- `components/ui/CrtOverlay.tsx`
- `components/ui/CustomCursor.tsx`
- `components/ui/SoundSystem.ts` (Web Audio 8-bit synthesizer)
- Existing section layout, cartridge shelf, HUD, and game cabinet markup.
