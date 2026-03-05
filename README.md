# tevy2.ai

AI Marketing Concierge for SMEs. Each customer gets a dedicated AI marketing assistant powered by OpenClaw.

## Architecture

```
frontend/  (app/)     → Next.js 16 + Tailwind (static pages, calls backend API)
backend/              → Hono API server (auth, provisioning, DB)
agent-image/          → Docker image for OpenClaw agent instances
```

```
User → Frontend (Cloudflare Pages)
         ↓ API calls
       Backend (Railway)
         ↓ provisions
       Fly.io Machines (1 agent per user)
         ↓ chat
       Telegram / Webchat
```

## Quick Start (Local Dev)

### 1. Prerequisites
- Node.js 22+
- Supabase project (free tier)
- Stytch project (free tier, Consumer type)
- Fly.io account + API token
- Anthropic API key

### 2. Setup Supabase
Run `backend/sql/schema.sql` in your Supabase SQL editor.

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in your env vars in .env
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 4. Frontend

```bash
cd app
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if needed
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 5. Mock Auth (Local Dev)

With `NEXT_PUBLIC_MOCK_AUTH=true` in `app/.env.local`, the setup wizard will auto-verify emails after 2 seconds (no real Stytch needed for testing the flow).

## Env Vars

### Backend (.env)
| Var | Required | Description |
|-----|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `STYTCH_PROJECT_ID` | ✅ | Stytch project ID |
| `STYTCH_SECRET` | ✅ | Stytch secret |
| `FLY_API_TOKEN` | ✅ | Fly.io API token |
| `FLY_APP_NAME` | ✅ | Fly.io app name for agents |
| `ANTHROPIC_API_KEY` | ✅ | Master Anthropic key for agents |
| `FRONTEND_URL` | | Frontend URL for CORS (default: http://localhost:3000) |
| `AGENT_IMAGE` | | Docker image for agents (default: ghcr.io/mcclowin/tevy2.ai/agent:latest) |

### Frontend (.env.local)
| Var | Required | Description |
|-----|----------|-------------|
| `NEXT_PUBLIC_API_URL` | | Backend URL (default: http://localhost:3001) |
| `NEXT_PUBLIC_MOCK_AUTH` | | Skip Stytch for local dev (default: false) |

## Project Structure

```
tevy2.ai/
├── app/                        # Frontend (Next.js 16)
│   └── src/
│       ├── app/                # Pages (landing, setup, login, dashboard, chat)
│       └── lib/                # API client, auth helpers
├── backend/                    # Backend (Hono)
│   ├── src/
│   │   ├── routes/             # auth, instances
│   │   ├── lib/                # supabase, stytch, fly clients
│   │   └── middleware/         # auth middleware
│   └── sql/                    # Supabase schema
├── agent-image/                # Docker image for OpenClaw agents
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── templates/              # SOUL.md, AGENTS.md
│   └── skills/                 # Pre-configured skills
├── .github/workflows/
│   └── build-agent-image.yml   # Auto-rebuild on OpenClaw updates
└── PRD.md                      # Product requirements
```
