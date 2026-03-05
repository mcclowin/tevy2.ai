# tevy2.ai Agent Image

Shared Docker image for all Tevy instances. One image, differentiated by env vars.

## Architecture (Option C)

```
┌──────────────────────────────────────┐
│  tevy2-agent:latest                  │
│  ├── node:22-slim                    │
│  ├── openclaw@pinned                 │
│  ├── skills/ (pre-configured)        │
│  └── templates/ (SOUL.md, AGENTS.md) │
└──────────────────────────────────────┘
         ↑ shared by all instances
         │
    Env vars per user:
    - OWNER_NAME, BUSINESS_NAME, WEBSITE_URL
    - ANTHROPIC_API_KEY (master key)
    - TELEGRAM_BOT_TOKEN (per user, optional)
    - BRAND_PROFILE_B64 (base64 encoded)
    - COMPETITORS_B64 (base64 encoded)
    - MODEL, TIMEZONE, POSTING_GOAL
    - Social links: INSTAGRAM, TIKTOK, LINKEDIN, TWITTER, FACEBOOK
```

## Build locally

```bash
docker build -t tevy2-agent:dev agent-image/
```

## Run locally

```bash
docker run -d \
  -e OWNER_NAME="John" \
  -e BUSINESS_NAME="John's Coffee" \
  -e WEBSITE_URL="https://johnscoffee.com" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e MODEL="claude-sonnet-4-20250514" \
  -p 18789:18789 \
  tevy2-agent:dev
```

## Auto-rebuild

GitHub Actions checks for new OpenClaw versions daily at 6am UTC.
Also rebuilds on pushes to `agent-image/` directory.
Manual trigger available via workflow_dispatch.
