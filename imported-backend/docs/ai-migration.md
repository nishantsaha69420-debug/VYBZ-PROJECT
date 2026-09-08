# VYBZ // AI Service Migration Guide
## From Mock AI Service to Production Gemini Integration

This guide documents the procedure for transitioning the VYBZ Arcade prototype from the deterministic Mock AI Service to the live Gemini 2.5 Flash AI integration.

---

## 1. Architectural Parity

The application is engineered with an identical API boundary:

```
[CURRENT MOCK FLOW]
VYBZ Frontend (app/page.tsx)
      ↓
API Endpoints (/api/**)
      ↓
Service Factory (lib/services/index.ts)
      ↓
Mock AI Service (lib/services/mock-ai.ts)
      ↓
Mock Dataset (lib/mock-data/vybz-demo.ts)

[FUTURE PRODUCTION FLOW]
VYBZ Frontend (app/page.tsx) [UNCHANGED]
      ↓
API Endpoints (/api/**) [UNCHANGED]
      ↓
Service Factory (lib/services/index.ts) [UNCHANGED]
      ↓
Gemini AI Service (lib/services/ai-trivia.ts)
      ↓
Google Gemini 2.5 Flash API (@google/genai)
```

Because the frontend and API route handlers interact exclusively through the contracts in [types/api.ts](file:///c:/Users/NISHANT/Documents/VYBZ%20ANTIGRAVITY/nishant-chat/types/api.ts), **zero frontend code changes are required for migration**.

---

## 2. Migration Steps

### Step 1: Obtain a Google Gemini API Key
1. Navigate to Google AI Studio ([aistudio.google.com](https://aistudio.google.com)).
2. Generate an API Key with access to `gemini-2.5-flash`.

### Step 2: Update Environment Variables
In your root `.env` or production deployment dashboard:

```bash
# 1. Disable the Mock AI Service
MOCK_AI=false

# 2. Provide the live Gemini API Key
GEMINI_API_KEY="your-gemini-api-key-here"

# (Optional) Database Configuration
DATABASE_URL="postgresql://user:password@host:5432/vybz"
```

### Step 3: Restart the Server
Restart the Next.js process:
```bash
npm run dev
# or for production:
npm run build && npm run start
```

### Step 4: Verification
1. Inspect the terminal logs. You will see:
   ```
   [QUESTION GENERATION]
   ROM: ROM // 001
   Source author: ...
   Source quote: ...
   Validation: PASS
   ```
2. In the browser, the HUD telemetry badge will transition from:
   `● DEMO // MOCK AI`
   to:
   `● AI COMPILED // READY`
3. All arcade questions will be generated dynamically by Gemini 2.5 Flash while maintaining strict ground-truth attribution.

---

## 3. Fallback Safety

If Gemini experiences an outage, rate limit (HTTP 429), or network disconnection:
1. [lib/services/ai-trivia.ts](file:///c:/Users/NISHANT/Documents/VYBZ%20ANTIGRAVITY/nishant-chat/lib/services/ai-trivia.ts) automatically falls back to deterministic ground-truth generation without crashing the UI.
2. The HUD telemetry safely updates to `● DEMO // MOCK AI`.
3. Gameplay continues uninterrupted.
