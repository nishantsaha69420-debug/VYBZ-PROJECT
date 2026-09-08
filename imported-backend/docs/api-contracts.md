# VYBZ // API CONTRACTS SPECIFICATION

All endpoints use HTTP/JSON with standard response structures and HTTP status codes.

---

## 1. Chat Ingestion

### `POST /api/chat/ingest`

Accepts either `multipart/form-data` containing an uploaded chat `.txt` or `.json` file, or a JSON payload containing raw chat text.

#### Request (JSON)
```json
{
  "rawText": "[12/04/24, 11:22:15 PM] Nishant: anyone seen the aux cord?\n[12/04/24, 11:22:30 PM] Kabir: bro you literally took it yesterday",
  "fileName": "WhatsApp Chat with Core Team.txt"
}
```

#### Response (200 OK)
```json
{
  "sessionId": "chat_k39f82kd",
  "participants": ["Nishant", "Kabir", "Aanya", "Rohan"],
  "messageCount": 1420,
  "topQuotes": [
    {
      "id": "msg_001",
      "author": "Nishant",
      "text": "anyone seen the aux cord?",
      "timestamp": "2024-04-12T23:22:15Z"
    }
  ],
  "sampleSnippets": [
    "Nishant: anyone seen the aux cord?",
    "Kabir: bro you literally took it yesterday"
  ]
}
```

---

## 2. Trivia Game Generation

### `POST /api/game/generate`

Generates source-grounded trivia questions for a chat session.

#### Request
```json
{
  "sessionId": "chat_k39f82kd",
  "rom": "ROM // 001: WHO SAID IT?",
  "questionCount": 5,
  "userId": "player_892kd8"
}
```

#### Response (200 OK)
```json
{
  "gameId": "game_98dj283d",
  "rom": "ROM_001",
  "questions": [
    {
      "id": "q_001",
      "round": "ROUND 01",
      "category": "WHO SAID IT?",
      "prompt": "WHICH PARTICIPANT AUTHORED THIS REAL ARCHIVED STATEMENT?",
      "quote": "anyone seen the aux cord?",
      "options": [
        { "key": "A", "label": "Kabir", "tag": "AUTHOR" },
        { "key": "B", "label": "Nishant", "tag": "AUTHOR" },
        { "key": "C", "label": "Aanya", "tag": "AUTHOR" },
        { "key": "D", "label": "Rohan", "tag": "AUTHOR" }
      ],
      "correctAnswer": "B",
      "explanation": "Spoken by Nishant on 12/04/24 in the group chat.",
      "difficulty": "medium",
      "sourceType": "WHO_SAID_IT",
      "sourceMessageIds": ["msg_001"]
    }
  ]
}
```

---

## 3. Multiplayer Rooms

### `POST /api/rooms` (Create Room)
```json
{
  "gameId": "game_98dj283d",
  "hostUserId": "player_892kd8",
  "displayName": "Nishant"
}
```
**Response (200 OK)**
```json
{
  "roomId": "room_9d8f72ka",
  "roomCode": "VYBZ-7K4P",
  "hostUserId": "player_892kd8"
}
```

### `POST /api/rooms/join` (Join Room)
```json
{
  "roomCode": "VYBZ-7K4P",
  "userId": "player_110a8c",
  "displayName": "Kabir"
}
```
**Response (200 OK)**
```json
{
  "roomId": "room_9d8f72ka",
  "roomCode": "VYBZ-7K4P",
  "players": [
    { "userId": "player_892kd8", "displayName": "Nishant", "isHost": true },
    { "userId": "player_110a8c", "displayName": "Kabir", "isHost": false }
  ],
  "status": "LOBBY"
}
```

### `GET /api/rooms/[roomId]` (Poll State)
```
GET /api/rooms/VYBZ-7K4P?userId=player_892kd8
```
**Response (200 OK)**
```json
{
  "roomId": "room_9d8f72ka",
  "roomCode": "VYBZ-7K4P",
  "gameId": "game_98dj283d",
  "hostUserId": "player_892kd8",
  "status": "QUESTION",
  "currentQuestionIndex": 0,
  "totalQuestions": 5,
  "questionStartedAt": "2026-09-08T01:30:00.000Z",
  "questionDeadline": "2026-09-08T01:30:15.000Z",
  "remainingSeconds": 12,
  "currentQuestion": {
    "id": "q_001",
    "round": "ROUND 01",
    "category": "WHO SAID IT?",
    "prompt": "WHICH PARTICIPANT AUTHORED THIS REAL ARCHIVED STATEMENT?",
    "quote": "anyone seen the aux cord?",
    "options": [
      { "key": "A", "label": "Kabir", "tag": "AUTHOR" },
      { "key": "B", "label": "Nishant", "tag": "AUTHOR" },
      { "key": "C", "label": "Aanya", "tag": "AUTHOR" },
      { "key": "D", "label": "Rohan", "tag": "AUTHOR" }
    ]
  },
  "players": [
    {
      "id": "player_892kd8",
      "userId": "player_892kd8",
      "displayName": "Nishant",
      "score": 0,
      "isReady": true,
      "isConnected": true,
      "isHost": true,
      "hasAnsweredCurrent": false
    }
  ],
  "leaderboard": [],
  "isHost": true
}
```

### `POST /api/rooms/[roomId]/start` (Launch Tournament)
```json
{
  "hostUserId": "player_892kd8"
}
```

### `POST /api/rooms/[roomId]/answer` (Submit Answer)
```json
{
  "userId": "player_892kd8",
  "questionId": "q_001",
  "selectedAnswer": "B",
  "responseTimeMs": 1420
}
```
**Response (200 OK)**
```json
{
  "correct": true,
  "correctAnswer": "B",
  "points": 952,
  "totalScore": 952,
  "explanation": "Spoken by Nishant on 12/04/24 in the group chat."
}
```

### `POST /api/rooms/[roomId]/next` (Advance Round)
Advances the room to the next round or concludes the tournament if the final question was answered.

### `POST /api/rooms/[roomId]/finish` (Conclude Match)
Locks the final leaderboard and stores match history.

---

## 4. Player Profiling & Memory

### `GET /api/profile?userId=player_892kd8`
Returns the behavioral profile, accuracy statistics, preferred categories, and dynamic difficulty tier for the player.
