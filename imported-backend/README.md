# VYBZ Backend API & Engine Standalone Package

This directory contains **ONLY the backend files** (API Route Handlers, Gemini AI Generators, Database Layer, Multiplayer Room Engine, Types, and Client SDK) extracted from the VYBZ project.

---

## 📁 Directory Structure

```
vybz-backend-standalone/
├── app/
│   └── api/                     # All Next.js Server API Routes
│       ├── chat/ingest/         # POST: Analyze & Ingest exported chat files (.txt / json)
│       ├── game/
│       │   ├── generate/        # POST: Generate AI trivia questions using Gemini
│       │   ├── answer/          # POST: Validate single-player answer & score
│       │   ├── complete/        # POST: Finalize single-player match
│       │   └── master/          # POST: Gemini AI Game Master dynamic commentary
│       ├── profile/             # GET: Fetch player behavioral stats
│       └── rooms/               # Multiplayer Room API
│           ├── route.ts         # POST: Create Room / GET: List Rooms
│           ├── join/            # POST: Join existing room
│           └── [roomId]/
│               ├── route.ts     # GET: Poll Room state (1 source of truth)
│               ├── ready/       # POST: Toggle ready status
│               ├── start/       # POST: Host starts match
│               ├── answer/      # POST: Submit room MCQ answer
│               ├── next/        # POST: Advance to next question
│               └── finish/      # POST: Conclude multiplayer match
├── lib/                         # Core Backend Logic & Engines
│   ├── gemini.ts                # Official @google/genai Gemini 2.5/Flash AI client setup
│   ├── db.ts                    # Prisma Database client setup (with in-memory fallback)
│   ├── api-client.ts            # Type-safe TS Browser Client for connecting any frontend
│   ├── chat/                    # Chat parser & behavioral analyzer
│   ├── game/                    # Dynamic trivia generator logic
│   └── multiplayer/             # In-Memory + Prisma Room Engine
├── prisma/
│   └── schema.prisma            # Full PostgreSQL Database Schema (GameRoom, Player, Question, Answer)
├── types/                       # TypeScript API Contracts & Shared Models
│   ├── api.ts                   # Request/Response DTO contracts
│   ├── multiplayer.ts           # Room & Player interfaces
│   └── vybz.ts                  # Question & Quiz data models
└── docs/                        # Complete API & Architecture Documentation
    ├── api-contracts.md         # Full endpoint-by-endpoint reference with payloads
    ├── architecture.md          # Multi-layer game engine architecture
    └── multiplayer.md           # Room state machine specification
```

---

## ⚡ Quick Start

### 1. Environment Setup
Create a `.env` file in the root of your project:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/vybz?schema=public
```

> **Note:** If `DATABASE_URL` is omitted, the backend automatically runs using a zero-config, highly-performant **in-memory database store** for rooms and games!

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Backend (Next.js Dev Server)
```bash
npm run dev
```
The API routes will be available at `http://localhost:3000/api/...`.

---

## 🔌 Connecting a New Frontend

The easiest way for your teammate to connect their new frontend to this backend is to import the provided **Type-Safe API Client**:

### Example Usage in Frontend:
```typescript
import { apiClient } from "./lib/api-client";

// 1. Create a Multiplayer Room
const roomResponse = await apiClient.createRoom({
  hostName: "PlayerOne",
  roomCode: "VYBZ-1234",
  settings: { roundCount: 5, timeLimitSeconds: 15 }
});

// 2. Poll Room State (Recommended interval: 800ms during play, 4000ms when finished)
const roomState = await apiClient.getRoom(roomResponse.roomId, "player_id_here");

// 3. Submit an Answer
await apiClient.submitRoomAnswer(roomResponse.roomId, {
  userId: "player_id_here",
  questionId: "q_123",
  selectedAnswer: "A",
  responseTimeMs: 2400
});
```

---

## 📑 Full API Documentation
Detailed request & response schemas for every endpoint are available in `docs/api-contracts.md`.
