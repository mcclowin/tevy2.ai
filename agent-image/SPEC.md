# Agent Image Spec — tevy2.ai

> What's inside every customer's bot. This is the canonical reference.
> Updated: 2026-03-24

---

## Overview

Each Tevy customer gets a dedicated Hetzner CX23 VPS running:
- **Ubuntu** (from base Hetzner snapshot)
- **Node.js 22** (via NodeSource)
- **OpenClaw** (globally installed via npm)
- **Tevy agent image** (cloned to `/opt/tevy/` from `mcclowin/tevy-agent-image`)

The agent image provides: SOUL.md, AGENTS.md, skills, templates, and an update script. Customer workspace files are generated at provision time from cloud-init and live independently after first boot.

---

## Architecture

```
/opt/tevy/                         ← Git repo (updatable via git pull)
├── VERSION                        ← Current image version
├── Dockerfile                     ← For Docker-based deploys (not used in VPS mode)
├── entrypoint.sh                  ← Docker entrypoint (not used in VPS mode)
├── scripts/
│   └── update.sh                  ← Update script: git pull + openclaw update + restart
├── skills/                        ← Shared skills (symlinked into workspace)
│   └── tevy-sync/                 ← Dashboard sync skill
│       ├── SKILL.md
│       └── sync.sh
└── templates/                     ← First-boot templates (copied, not symlinked)
    ├── SOUL.md
    ├── AGENTS.md
    ├── HEARTBEAT.md
    ├── USER.md
    └── memory/
        ├── brand-profile.md
        ├── competitors.md
        ├── content-calendar.md
        ├── decisions/decision-log.md
        ├── analytics/.gitkeep
        ├── research/.gitkeep
        └── seo/.gitkeep

/home/agent/.openclaw/              ← Customer's OpenClaw installation
├── openclaw.json                   ← Config (channels, gateway, plugins)
├── agents/main/agent/
│   └── auth-profiles.json          ← Anthropic API key
├── credentials/
│   └── whatsapp/<account>/         ← WhatsApp session (if linked)
└── workspace/                      ← Agent workspace (customer-owned)
    ├── SOUL.md                     ← Copied from template, then independent
    ├── AGENTS.md                   ← Copied from template, then independent
    ├── USER.md                     ← Generated from customer data
    ├── HEARTBEAT.md                ← Copied from template
    ├── skills/                     ← Symlinks to /opt/tevy/skills/*
    └── memory/
        ├── brand-profile.md        ← Generated from onboarding data
        ├── competitors.md          ← Generated from onboarding data
        ├── content-calendar.md     ← Empty template
        ├── decisions/decision-log.md
        ├── activity-log.md         ← Created by agent at runtime
        ├── research/               ← Agent writes research here
        ├── seo/                    ← Agent writes SEO audits here
        └── analytics/              ← Agent writes analytics here
```

---

## What's Installed

### System
| Component | Version | Source |
|-----------|---------|--------|
| Ubuntu | 22.04 LTS | Hetzner snapshot |
| Node.js | 22.x | NodeSource |
| OpenClaw | Latest (pinned to snapshot, updated via update.sh) | npm |
| Git | System | apt |

### OpenClaw Skills (pre-installed via symlink)
| Skill | Purpose | Source |
|-------|---------|--------|
| `tevy-sync` | Syncs dashboard config changes to workspace | Custom (in-repo) |

### OpenClaw Skills (available via ClawHub — NOT pre-installed yet)
| Skill | Purpose | Status |
|-------|---------|--------|
| `market-research` | Competitor research, market sizing | Planned |
| `copywriting` | Website/landing page copy | Planned |
| `social-content` | Social media post drafting | Planned |
| `seo-audit` | Website SEO analysis | Planned |

### Marketing Skills (bundled in McClowin's OpenClaw, NOT in agent image)
The marketing skill pack exists in McClowin's workspace at `~/.openclaw/workspace/skills/marketing-skills/`. These need to be packaged and either:
1. Published to ClawHub and installed per-agent, OR
2. Added to the agent-image repo under `skills/`

**Decision needed:** Which approach? ClawHub is cleaner but adds install step.

---

## Channels Supported

| Channel | Status | Config |
|---------|--------|--------|
| Telegram | ✅ Supported | Bot token provided at onboarding |
| WhatsApp | ✅ Supported (new) | QR linking via dashboard |
| Webchat | ✅ Built-in | Via `{slug}.agents.tevy2.ai` |
| Discord | 🔜 Planned | — |
| Slack | 🔜 Planned | — |

---

## Config (openclaw.json)

Generated at provision time. Key fields:

```json5
{
  auth: { profiles: { "anthropic:default": { provider: "anthropic", mode: "token" } } },
  agents: { defaults: { workspace: "/home/agent/.openclaw/workspace", maxConcurrent: 4 } },
  gateway: { port: 18789, mode: "local", bind: "lan", auth: { mode: "token", token: "<per-customer>" } },
  channels: {
    telegram: { enabled: true, botToken: "<per-customer>", dmPolicy: "open", allowFrom: ["*"] },
    // whatsapp: added via dashboard connect flow
  },
  plugins: { entries: { telegram: { enabled: true } } }
}
```

---

## Environment

| Var | Source | Purpose |
|-----|--------|---------|
| `NODE_OPTIONS=--max-old-space-size=1536` | systemd EnvironmentFile | Memory limit |
| Anthropic API key | auth-profiles.json | LLM access |
| Tavily API key | /etc/tevy/shared-keys.env | Web search |
| Gateway token | openclaw.json | Dashboard ↔ agent auth |

---

## Update Mechanism

1. Dashboard sends `POST /api/agents/:id/update`
2. Backend SSHes into VPS → runs `/opt/tevy/scripts/update.sh`
3. update.sh does: `cd /opt/tevy && git pull` → `npm update -g openclaw` → `systemctl restart openclaw-gateway`
4. New skills/templates from repo are available immediately (via symlinks)
5. Workspace files (SOUL.md, AGENTS.md) are NOT overwritten — customer owns them after first boot

---

## Networking

| Port | Service | Access |
|------|---------|--------|
| 22 | SSH | Backend IP only (Hetzner firewall) |
| 18789 | OpenClaw Gateway | Load Balancer IP only (Hetzner firewall) |

- DNS: `*.agents.tevy2.ai` → Hetzner Load Balancer
- TLS: Terminated at Load Balancer (€5.49/mo)
- Webchat: Browser → LB → Gateway WebSocket

---

## Pricing Breakdown (per customer)

| Cost | Amount | Notes |
|------|--------|-------|
| Hetzner CX23 VPS | €4.49/mo | 2 vCPU, 4GB RAM, 40GB NVMe |
| Hetzner LB share | ~€0.50/mo | Shared across all customers |
| Anthropic API | Variable | Shared platform key, usage-based |
| Tavily API | Shared | Platform key |
| **Total infra** | **~€5-6/mo** | Before API usage |
