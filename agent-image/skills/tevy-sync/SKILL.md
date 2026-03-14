---
name: tevy-sync
description: "Heartbeat sync skill for Tevy2 bots. Pulls config changes and tasks from the Tevy2 dashboard, writes updated files to workspace, executes tasks, and reports results back."
---

# Tevy Sync — Dashboard ↔ Bot Heartbeat

This skill syncs the bot with the Tevy2 dashboard. It runs on a cron schedule (every 30 minutes).

## What It Does

1. **Pulls config changes** — If the owner updated their brand profile, competitors, or settings in the dashboard, this skill downloads and writes the updated files.
2. **Picks up tasks** — If the owner requested a post draft, research, or SEO audit from the dashboard, this skill receives the task and executes it.
3. **Reports results** — After completing a task, sends results back to the dashboard (draft posts go to the Approvals tab).
4. **Checks approvals** — If the owner approved or rejected a draft, this skill gets the decision.

## How to Use

This skill is called automatically by the heartbeat cron. You can also call it manually:

```
Sync with dashboard now
```

## Environment Variables Required

- `TEVY2_BACKEND_URL` — The dashboard backend URL (e.g., https://api.tevy2.ai)
- `GATEWAY_TOKEN` — The bot's gateway token (used to authenticate with the backend)

## API Endpoints

- `GET  /api/sync?since_version=N` — Pull changes since version N
- `POST /api/sync/report` — Send task results back
- `GET  /api/sync/approvals` — Check approval decisions

## Sync Protocol

```
Bot heartbeat fires (every 30 min)
  → GET /api/sync?since_version=42
  ← { version: 43, changes: [...], tasks: [...] }
  → Write changed files to /workspace/
  → Execute tasks (draft posts, research, etc.)
  → POST /api/sync/report { task_id, type, results }
  → GET /api/sync/approvals
  ← { approvals: [{ status: "approved", content: "..." }] }
  → Publish approved posts
  → Save version=43 locally
```

## File: sync-version.json

Stored at `/workspace/memory/.sync-version.json`:

```json
{
  "version": 43,
  "lastSync": "2026-03-14T16:00:00Z"
}
```
