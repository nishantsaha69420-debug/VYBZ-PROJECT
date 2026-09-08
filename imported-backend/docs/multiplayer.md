# VYBZ // MULTIPLAYER SYSTEM & STATE MACHINE

## 1. State Machine

```
              ┌─────────────────────────────────┐
              │              LOBBY              │
              │  Players join via Room Code     │
              │  Host configures rules & roster │
              └────────────────┬────────────────┘
                               │
                       Host starts match
                               │
                               ▼
              ┌─────────────────────────────────┐
              │            QUESTION             │
              │  15s countdown timer            │
              │  Clients submit answers         │
              │  Correct answer masked          │
              └────────────────┬────────────────┘
                               │
             Timer expires OR all players answer
                               │
                               ▼
              ┌─────────────────────────────────┐
              │             RESULTS             │
              │  Correct answer unmasked        │
              │  Explanations displayed         │
              │  Points & speed bonus awarded   │
              └────────────────┬────────────────┘
                               │
                     Host advances round
                               │
                 ┌─────────────┴─────────────┐
                 │ (more questions)          │ (last question)
                 ▼                           ▼
            [QUESTION]                 ┌───────────┐
                                       │ FINISHED  │
                                       │ Podiums & │
                                       │ GC Titles │
                                       └───────────┘
```

---

## 2. Server-Authoritative Scoring System

Scoring is computed strictly on the server:

$$\text{Points} = \text{Base Points} + \text{Speed Bonus}$$

- **Base Points**: 500 points for a correct answer. 0 points for an incorrect answer.
- **Speed Bonus**: Up to 500 points for rapid answers within the 15-second time limit:
  $$\text{Bonus} = \max\left(0, \left\lfloor 500 \times \left(1 - \frac{\text{responseTimeMs}}{15000}\right)\right\rfloor\right)$$
- **Max Possible Per Round**: 1,000 points.

---

## 3. Polling Protocol

Clients poll `GET /api/rooms/[roomId]?userId=[playerId]` at regular intervals:
- **Active Round (`QUESTION`, `RESULTS`)**: Polling interval = 1,500ms.
- **Finished (`FINISHED`)**: Polling interval slowed to 4,000ms or disconnected.
- **Immediate Re-Sync**: Whenever a player submits an answer or the host clicks "Next", the client immediately triggers a state poll to eliminate perceived latency.
- **Stateless Compatibility**: Because all state is stored in the database, any serverless worker instance on Vercel can handle any request without session affinity or persistent connections.
