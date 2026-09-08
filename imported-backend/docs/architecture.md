# VYBZ // PRODUCTION BACKEND ARCHITECTURE

## 1. System Overview

VYBZ is a retro-cyberpunk multiplayer trivia arcade machine that ingests real group chat exports (e.g. WhatsApp .txt or JSON) and generates source-grounded trivia tournaments played simultaneously across multiple devices.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      VYBZ FRONTEND                     │
                    │      Next.js 16 App Router (app/page.tsx, GSAP, WebAudio)│
                    │   CRT Scanlines • Phosphor HUD • Retro Sound Synth     │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                        HTTP JSON REST
                                    (lib/api-client.ts)
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               NEXT.JS ROUTE HANDLERS (/api/*)          │
                    │  • /api/chat/ingest        • /api/game/generate        │
                    │  • /api/game/answer        • /api/game/complete        │
                    │  • /api/game/master        • /api/profile              │
                    │  • /api/rooms (create)     • /api/rooms/join           │
                    │  • /api/rooms/[roomId]     • /api/rooms/[roomId]/start │
                    │  • /api/rooms/[roomId]/answer                          │
                    │  • /api/rooms/[roomId]/next                            │
                    │  • /api/rooms/[roomId]/finish                          │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │                                                     │
                     ▼                                                     ▼
┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
│             CORE ENGINES               │   │            INTELLIGENCE LAYER          │
│ • lib/chat/parser.ts (WhatsApp/JSON)   │   │ • lib/openai.ts (OpenAI gpt-4o client) │
│ • lib/chat/analyzer.ts (Facts vs Infs) │   │ • lib/game/generator.ts (5 ROM gen)    │
│ • lib/game/scoring.ts (Server-auth)    │   │ • lib/game/validator.ts (Invariants)   │
│ • lib/game/adaptation.ts (Difficulty)  │   │ • lib/game/master.ts (Game Master)     │
│ • lib/multiplayer/room-engine.ts       │   │                                        │
│ • lib/profile/service.ts (Memory)      │   │                                        │
└────────────────────┬───────────────────┘   └────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             PERSISTENCE & DATA LAYER                                │
│                     PostgreSQL via Prisma ORM (prisma/schema.prisma)                 │
│              Resilient In-Memory Database Fallback for Zero-Config Dev (lib/db.ts)    │
│                                                                                     │
│ Models: User, ChatSession, ChatParticipant, ChatMessage, PlayerProfile,              │
│         Game, GameQuestion, GameAnswer, GameRoom, RoomPlayer, RoomAnswer, GameEvent │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Directory Architecture

```
nishant-chat/
├── app/
│   ├── api/
│   │   ├── chat/ingest/route.ts       # WhatsApp TXT & JSON file ingestion
│   │   ├── game/
│   │   │   ├── generate/route.ts      # 5 ROM question generator
│   │   │   ├── answer/route.ts        # Server-authoritative answer grader
│   │   │   ├── complete/route.ts      # Tournament summarizer & profile updater
│   │   │   └── master/route.ts        # VYBZ Game Master recommendation engine
│   │   ├── rooms/
│   │   │   ├── route.ts               # Room creation (POST /api/rooms)
│   │   │   ├── join/route.ts          # Room join with roomCode (POST /api/rooms/join)
│   │   │   └── [roomId]/
│   │   │       ├── route.ts           # State poll (GET /api/rooms/[roomId])
│   │   │       ├── ready/route.ts     # Player ready toggle
│   │   │       ├── start/route.ts     # Host tournament launch
│   │   │       ├── answer/route.ts    # Multiplayer answer submission
│   │   │       ├── next/route.ts      # Advance to next question
│   │   │       └── finish/route.ts    # Conclude match and lock leaderboard
│   │   └── profile/route.ts           # Player behavioral memory profile
│   ├── layout.tsx                     # Root HTML shell & viewport metadata
│   └── page.tsx                       # Complete Arcade frontend with CRT & WebAudio
├── components/
│   ├── sections/
│   │   ├── DocumentSelector.tsx       # Step 01: Chat Archive Ingestion & Presets
│   │   ├── MatchConfigLobby.tsx       # Step 02: Multiplayer Lobby & Host Roster
│   │   ├── TriviaArena.tsx            # Step 03: Standout Trivia Cabinet (Centerpiece)
│   │   └── LeaderboardPodium.tsx      # Step 04: Post-Match Ranked Podium
│   └── ui/
│       ├── Barcode.tsx                # Procedural SVG barcode HUD
│       ├── CrtOverlay.tsx             # Scanlines and phosphor noise
│       └── CustomCursor.tsx           # Hardware-accelerated square CRT crosshair
├── lib/
│   ├── api-client.ts                  # Typed browser API client with all 15 methods
│   ├── db.ts                          # Database singleton with resilient fallback
│   ├── openai.ts                      # OpenAI client with structured JSON enforcement
│   ├── chat/
│   │   ├── parser.ts                  # WhatsApp TXT regex + JSON parser
│   │   └── analyzer.ts                # Dual-pass fact vs inference analyzer
│   ├── game/
│   │   ├── generator.ts               # 5 ROM trivia generator with fallback corpus
│   │   ├── validator.ts               # Grounding invariant checker
│   │   ├── scoring.ts                 # Speed bonus calculation & leaderboard builder
│   │   └── adaptation.ts              # Adaptive difficulty & personalized categories
│   ├── multiplayer/
│   │   ├── room-code.ts               # Unambiguous VYBZ-XXXX code generator
│   │   └── room-engine.ts             # Server-authoritative multiplayer state machine
│   └── profile/
│       └── service.ts                 # Behavioral memory and profiling service
├── prisma/
│   └── schema.prisma                  # 12 relational models for PostgreSQL
└── types/
    ├── api.ts                         # Request and response contract interfaces
    ├── multiplayer.ts                 # Room state machine, player, and poll types
    └── vybz.ts                        # Core ROM, question, option, and profile types
```

---

## 3. Grounding & Anti-Hallucination Invariants

Every question generated in the VYBZ system adheres to strict mathematical invariants verified by `lib/game/validator.ts`:

1. **Option Integrity**: Every question MUST provide exactly 4 options labeled `A`, `B`, `C`, and `D`.
2. **Key Exclusivity**: Exactly one option's key must match `correctAnswer`.
3. **Attribution Invariant (ROM 001)**:
   For `ROM // 001: WHO SAID IT?`:
   $$\text{options}[\text{correctAnswer}].\text{label} \equiv \text{sourceMessage}.\text{author}$$
   The correct answer must be the exact verbatim speaker of the quote, grounded in verified `sourceMessageIds`.
4. **Separation of Facts from Inferences**:
   In `lib/chat/analyzer.ts`, real chat messages are stored as immutable `facts` (quotes, authors, timestamps). Inferences (inside jokes, relationship dynamics, behavioral traits) are stored separately and clearly marked as inferred context.

---

## 4. Server-Authoritative Multiplayer Design

To ensure zero dependencies on long-lived WebSocket processes and ensure 100% compatibility with Vercel serverless deployment:

- **State Storage**: Room state is stored persistently in PostgreSQL (or `memoryDb` during local offline testing).
- **Client Synchronization**: Clients poll `GET /api/rooms/[roomId]?userId=...` every 1.5 seconds during active play.
- **Clock Authority**: Question deadlines (`questionDeadline`) are computed and stored on the server. The server automatically transitions questions to `RESULTS` when the deadline expires.
- **Scoring Authority**: Points are calculated on the server using timestamp deltas:
  $$\text{Score} = \begin{cases} 500 + \max\left(0, \left\lfloor 500 \times \left(1 - \frac{\Delta t}{T_{\text{limit}}}\right)\right\rfloor\right) & \text{if correct} \\ 0 & \text{if incorrect} \end{cases}$$
