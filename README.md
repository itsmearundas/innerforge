# InnerForge 🔥

> AI that learns who you are from your private journal, then uses that knowledge to challenge your ideas, coach your growth, and talk with you anytime.

## What's Built

| Module | Description |
|--------|-------------|
| **Mirror** | TipTap journal — every entry analyzed by Claude API for emotions, themes, biases |
| **Forge** | Idea stress-tester — 10-angle attack using your personal psychological blind spots |
| **Arena** | Live debates via Socket.io — invite friends or submit ideas for community stress-testing |
| **Evolution** | Recharts dashboard — bias radar, mood timeline, psychological growth narrative |
| **The Oracle** | Always-on AI companion — voice + text, auto-detects mode (Mirror/Forge/Coach/Arena) |

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + TipTap + Zustand + Recharts
- **Backend**: Node.js + Express + Socket.io
- **Database**: MongoDB Atlas + Mongoose
- **AI**: Claude API (Anthropic) — `claude-opus-4-5` for deep analysis, `claude-sonnet-4-6` for Oracle
- **Real-time**: Socket.io (Arena debates) + SSE (background insights push)
- **Voice**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Deploy**: Vercel (client) + Render (server)

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Set up environment variables

```bash
cd server
cp .env.example .env
# Fill in: MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
```

### 3. Run development

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open `http://localhost:5173`

## Deployment

### Backend → Render
1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repo, set root dir to `server/`
3. Build command: `npm install`, Start command: `node server.js`
4. Add all environment variables from `.env.example`

### Frontend → Vercel
1. Import repo on [vercel.com](https://vercel.com), set root dir to `client/`
2. Add env var: `VITE_API_URL=https://your-render-url.onrender.com`
3. Update `vite.config.js` proxy target to your Render URL

## Key Architecture Decisions

**Personalization Engine**: After every 3 journal entries, the system calls Claude API with all analyzed entries and rebuilds the `PsychProfile` document. When the Forge stress-tests an idea, this profile is injected into the prompt — making attacks personal, not generic.

**Background Daemon**: `oracleDaemon.js` runs every 20 minutes, scans all opted-in users' recent journals, and generates proactive insights. These push to the browser via SSE (Server-Sent Events) — no polling required.

**Oracle Conversation**: The Oracle receives the last 10 messages as context on every call, enabling coherent multi-turn conversations. It auto-detects intent and switches between Mirror/Forge/Coach/Arena modes.

## Interview Talking Points

1. **Personalization**: "The AI prompt changes per user — it pulls their psychological profile from MongoDB and injects their top biases into the stress-test prompt. That's not just an API call, it's a personalization engine."

2. **Real-time**: "Background insights use SSE push — the server streams to an open connection rather than the client polling every N seconds. Arena debates use Socket.io rooms."

3. **D3/Recharts**: "The bias radar is a Recharts `RadarChart` fed from the aggregated `PsychProfile`. The argument tree (Week 7 extension) uses D3's `hierarchy` and `tree` layout."
