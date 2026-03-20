# tevy2.ai — Product Requirements Document

> AI Marketing Concierge for SMEs
> Status: In Development
> Last updated: 2026-03-16 00:06 UTC

---

## 1. Problem

Small and medium businesses need marketing but can't afford agencies or full-time marketers. They know their product but don't know how to position it, what to post, or what competitors are doing. They need a marketing person — not another tool with 50 buttons.

## 2. Solution

tevy2.ai is an AI marketing concierge powered by OpenClaw. Each SME gets a dedicated AI assistant that:
- Learns their brand from existing materials
- Drafts and schedules social media posts
- Conducts market research and competitor tracking
- Communicates like a human marketing consultant via chat

## 3. Core Principles

- **The bot is an employee, not a tool.** It has a role (marketing), reports to the admin, and acts like a human team member.
- **Concierge, not dashboard-first.** The chat IS the product. The dashboard supports it.
- **One VPS per user.** Full VM isolation. Their data, their server, their agent.
- **OpenClaw is the framework.** We don't rebuild what OpenClaw already handles. We provide a curated image on top of it.
- **VPS is the source of truth.** The backend just knows which VPS belongs to who. The agent manages its own state (skills, config, memory).
- **Platform agnostic.** User chooses their chat channel (Telegram, WhatsApp, or embedded webchat).

---

## 4. What the Product Actually Is

A curated OpenClaw image + a way to deploy and update it.

```
YOUR PRODUCT = Git repo with:
├── Custom SOUL.md (marketing concierge personality)
├── Custom AGENTS.md (agent behavior rules)
├── Custom memory structure (brand-profile.md, competitors.md, etc.)
├── Pre-installed custom skills (brand-analyzer, social-drafter, etc.)
├── Shared API keys (Tavily, Brave, etc.)
└── Scripts to provision, update, and backup
```

Deployed on a per-customer Hetzner VPS. Updated via git push + SSH.

---

## 5. Architecture

```
┌──────────────┐     ┌────────────────────────┐     ┌────────────────┐
│   Netlify    │     │   Railway (Platform)   │     │ Hetzner Cloud  │
│  Dashboard   │────▶│                        │────▶│                │
│  Next.js     │     │  2 DB tables:          │     │  VPS per user  │
│  Static      │     │  - accounts            │     │                │
│  Free        │     │  - agents              │     │  Each VPS:     │
│              │     │                        │     │  - OpenClaw    │
│              │     │  Thin API:             │     │  - Your skills │
│              │     │  - Hetzner proxy       │     │  - Their data  │
│              │     │  - Auth (Stytch)       │     │                │
│              │     │  - Billing (Stripe)    │     │  Updated via   │
│              │     │                        │     │  git push + SSH│
└──────────────┘     └────────────────────────┘     └────────────────┘
```

### Why 1:1 VPS

- **Simplicity**: No container orchestration, no bin-packing, no tracking which container is on which host
- **Security**: Full VM isolation (own kernel). One customer compromised ≠ all customers compromised
- **OpenClaw native**: It's just a normal OpenClaw install. No container quirks.
- **Portability**: tar the home directory → scp to new VPS → done
- **Customer gets**: 2 vCPU, 4GB RAM, 40GB SSD — a real machine

### Server Spec

**Hetzner CX23** (x86 Intel/AMD): 2 vCPU, 4GB RAM, 40GB NVMe, 20TB traffic, ~€4.49/mo

### Networking

- **DNS**: Wildcard `*.agents.tevy2.ai` → Hetzner Load Balancer IP
- **TLS**: Hetzner Load Balancer (€5.49/mo, handles all TLS)
- **Firewall**: Hetzner Cloud Firewall (free, API-managed)
  - SSH (22): Only from backend IP
  - Gateway (18789): Only from Load Balancer IP

---

## 6. Two Layers on Each VPS

```
/opt/tevy/  ← YOUR STUFF (updatable via git pull, shared across all customers)
├── version.txt
├── openclaw-version.txt
├── soul.md                    ← template (copied to workspace on first boot)
├── agents.md                  ← template (copied to workspace on first boot)
├── memory-template/           ← initial memory structure
│   ├── brand-profile.md
│   ├── competitors.md
│   └── content-calendar.md
├── skills/                    ← your custom skills (symlinked into workspace)
│   ├── brand-analyzer/SKILL.md
│   ├── social-drafter/SKILL.md
│   ├── seo-auditor/SKILL.md
│   ├── competitor-tracker/SKILL.md
│   ├── market-research/SKILL.md
│   ├── keyword-researcher/SKILL.md
│   └── content-seo/SKILL.md
├── shared-keys.env            ← Layer 2 API keys (Tavily, Brave, etc.)
├── provision.sh               ← first-time setup (run once)
└── update.sh                  ← update existing VPS (run many times)

/home/agent/.openclaw/  ← CUSTOMER'S STUFF (never touched by updates)
├── openclaw.json               ← their API keys, config
├── workspace/
│   ├── SOUL.md                 ← their copy (may have customized)
│   ├── AGENTS.md               ← their copy
│   ├── USER.md                 ← their profile
│   ├── MEMORY.md               ← their long-term memory
│   ├── memory/decisions/       ← durable business decisions + rationale
│   ├── memory/                 ← their daily notes, research, etc.
│   └── skills/ → /opt/tevy/skills  ← SYMLINK (updated via git pull)
├── agents/                     ← session data
└── settings/
```

**Skills are symlinked.** When you git push a skill update, all customers get it immediately on next gateway restart.

**SOUL.md / AGENTS.md** are copied once at first boot. After that, the customer's copy lives independently. Template updates only affect new customers.

### Agent Image Responsibilities

The agent image is responsible for shipping the shared Tevy system layer on every VPS:

- OpenClaw runtime and gateway service
- Tevy provision/update scripts
- Shared skills in `/opt/tevy/skills`
- Shared API-key loading from `/opt/tevy/shared-keys.env`
- Initial templates for `SOUL.md`, `AGENTS.md`, and memory files
- Guardrails around what the customer can and cannot modify

The image should treat `/opt/tevy` as the managed system layer and `/home/agent/.openclaw` as the customer-owned workspace layer.

### Browser Support — Social Platform Access

Each agent VPS must ship with headless browser capabilities for traversing and interacting with social platforms where API access is limited or unavailable.

**Why this matters:**
- X.com (Twitter), LinkedIn, and Instagram restrict or paywall their APIs
- X.com's API requires paid credits ($100/mo minimum for useful access)
- LinkedIn has no public content API — scraping is the only option for competitor monitoring
- Instagram's Graph API only covers the customer's own accounts, not competitors
- Real marketing intelligence requires reading public feeds, trending topics, and competitor profiles

**Base image must include:**
- Chromium/Chrome headless (pre-installed on the snapshot)
- Puppeteer or Playwright (npm dependency in the agent image)
- Xvfb (virtual framebuffer for non-headless fallback when sites detect headless mode)

**Platform-specific capabilities:**

| Platform | Read (public) | Write (post) | Auth method |
|----------|--------------|-------------|-------------|
| X.com | ✅ Headless browser | ✅ Puppeteer (bypasses 226 anti-automation) | Cookie-based (AUTH_TOKEN + CT0) |
| LinkedIn | ✅ Headless browser | ❌ Not supported (ToS risk) | Cookie-based or logged-out public |
| Instagram | ✅ Headless browser (public profiles) | ❌ Use Graph API for own account | Logged-out for public, Graph API for owned |

**Read operations (competitive intelligence):**
- Scrape competitor profiles, posts, engagement metrics
- Monitor trending topics and hashtags
- Track follower growth and posting cadence
- Screenshot competitor content for analysis

**Write operations (content publishing):**
- X.com: Post tweets/threads via Puppeteer (proven method — see `scripts/x-thread-puppeteer.js`)
- LinkedIn: Use official API or manual posting (browser automation for posting is ToS-risky)
- Instagram: Use Graph API for the customer's own account only

**Cookie/credential management:**
- Social platform cookies (X.com AUTH_TOKEN, LinkedIn li_at) are Layer 3 (customer-provided)
- Stored in the agent's encrypted config, not in shared keys
- Cookies expire periodically — agent should detect auth failures and prompt the customer to refresh
- The agent must never store or transmit social credentials to the platform backend

**Skill integration:**
- A `browser-social` skill should wrap common operations: read feed, search hashtag, get profile, screenshot post
- The skill handles Xvfb lifecycle, cookie injection, and anti-detection (user agent, viewport, timing)
- Competitive intelligence skills should call `browser-social` for data collection

**Snapshot requirements:**
- `chromium-browser` or `google-chrome-stable` apt package
- `xvfb` apt package
- `puppeteer` or `playwright` as global npm package (with browser binaries downloaded)
- `/usr/bin/xvfb-run` available for the agent user
- Sufficient disk space for browser cache (~500MB)

**Anti-detection considerations:**
- Use realistic viewport sizes (1920×1080)
- Randomize timing between actions (2-5s delays)
- Rotate user-agent strings
- Respect rate limits — no more than 100 page loads per hour per platform
- Do not attempt to bypass login walls for platforms where the customer hasn't provided credentials

### Decision Log

Each agent should maintain a durable decision log inside the customer workspace.

Recommended location:

- `/home/agent/.openclaw/workspace/memory/decisions/decision-log.md`

Purpose:

- capture durable business decisions made by the user
- record context, rationale, and downstream implications
- let the agent consult prior decisions before making future recommendations

`AGENTS.md` should contain the behavior rule:

- when the user makes a durable business decision, record it in the decision log
- decisions should not be silently overwritten
- if a decision changes, append a new dated entry that supersedes the old one

This keeps behavior rules in `AGENTS.md` and persistent customer state in workspace memory, which is closer to the OpenClaw model than storing evolving decisions inside `AGENTS.md` itself.

### Guardrails: User Cannot Update Their Own Image

Customers may edit their own workspace and agent behavior, but they must not be allowed to update the shared image layer themselves.

Allowed customer-controlled changes:

- workspace files such as `SOUL.md`, `AGENTS.md`, `USER.md`, and memory files
- channel/API-key configuration intended for their own agent
- normal conversation-driven changes inside the agent workspace

Forbidden customer-controlled changes:

- modifying `/opt/tevy`
- changing shared skills shipped with the image
- running `update.sh` directly from inside the agent chat flow
- self-upgrading OpenClaw, system packages, or the shared agent image

Policy:

- image updates are platform-controlled operations only
- Tevy operators or backend-controlled update jobs may run the image update flow
- the agent itself should refuse requests from end users to update or replace its own system layer

---

## 7. Three API Key Types

### Layer 1: Platform (never on VPS)
Stytch, Stripe, Supabase, Hetzner API token → Railway env vars only.

### Layer 2: Shared Services (we pay, baked into image repo)
Tavily, Brave, Anthropic/OpenAI, AgentMail → in `/opt/tevy/shared-keys.env`, loaded by OpenClaw via environment. Updated via git push.

### Layer 3: Customer (injected at boot, their responsibility)
Telegram bot token, HubSpot, GitHub, Gmail → in `openclaw.json`, written by cloud-init at VPS creation.

---

## 8. Flows

### New Customer (60 seconds)

```
1. Customer signs up on dashboard
2. Backend: hcloud server create --image <base-snapshot> --user-data <cloud-init>
3. cloud-init writes openclaw.json (customer's keys) + runs provision.sh
4. provision.sh: clones Git repo → copies templates → symlinks skills → starts gateway
5. Backend: adds VPS to load balancer
6. Agent is live at customer-slug.agents.tevy2.ai
```

### Update All Customers (git push → done)

```
1. You edit skills, SOUL.md template, shared keys, or bump OpenClaw version
2. git push to tevy-agent-image repo
3. GitHub Action SSHs into each VPS and runs update.sh
4. update.sh: git pull → update OpenClaw if needed → restart gateway
5. Customer data untouched. Skills updated via symlink. Done.
```

update.sh:
```bash
#!/bin/bash
cd /opt/tevy && git pull origin main
WANTED=$(cat openclaw-version.txt)
CURRENT=$(openclaw --version 2>/dev/null || echo "none")
[ "$CURRENT" != "$WANTED" ] && npm install -g openclaw@$WANTED
cp shared-keys.env /etc/tevy/shared-keys.env
systemctl restart openclaw-gateway
```

### Migrate Customer (5 commands)

```
1. ssh old-vps "tar czf /tmp/backup.tar.gz -C /home/agent .openclaw/"
2. scp old-vps:/tmp/backup.tar.gz new-vps:/tmp/
3. ssh new-vps "tar xzf /tmp/backup.tar.gz -C /home/agent/"
4. ssh new-vps "systemctl restart openclaw-gateway"
5. Update load balancer target
```

### Dashboard Actions (all via SSH to VPS)

| Action | What happens |
|--------|-------------|
| Create agent | hcloud server create + cloud-init |
| Stop agent | hcloud server poweroff |
| Start agent | hcloud server poweron |
| Delete agent | backup + hcloud server delete |
| Install skill | ssh: clawhub install X |
| Change personality | ssh: write to SOUL.md + restart |
| Update API key | ssh: edit openclaw.json + restart |
| View logs | ssh: tail logs |
| Backup | ssh: tar + upload |

---

## 9. Hetzner Snapshot (the base image)

The snapshot is just **Ubuntu + Node.js + OpenClaw**. That's it. All Tevy-specific stuff comes from the Git repo at provision time.

### How to build it (one-time, ~5 minutes):

```bash
hcloud server create --name temp --type cx23 --image ubuntu-24.04
ssh root@<ip>
  apt update && apt install -y nodejs npm git curl jq
  npm install -g openclaw
  # create agent user, systemd service, etc.
  exit
hcloud server create-image temp --description "tevy-base-v1"
hcloud server delete temp
```

### When to rebuild:
- Ubuntu major version → rebuild (~2x/year)
- Node.js major version → rebuild (~1x/year)
- Everything else → git push + update.sh (no rebuild needed)

**The snapshot is dumber than a Docker image.** No Dockerfile, no layer caching, no registry. Just "Ubuntu with Node.js" frozen in time.

---

## 10. Database (minimal)

Two tables in Supabase. That's it.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stytch_user_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  slug TEXT NOT NULL,
  hetzner_server_id TEXT,
  hetzner_ip TEXT,
  state TEXT DEFAULT 'provisioning',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, slug)
);
```

No skills table — OpenClaw tracks skills on disk.
No keys table — openclaw.json on VPS.
No templates table — cloud-init scripts in codebase.
No usage table — Stripe handles billing.

---

## 11. Platform Backend (~50 lines of real logic)

```typescript
app.post("/v1/agents", auth, async (c) => {
  const server = await hetzner.createServer({ ... });
  await db.insert("agents", { account_id, slug, server_id, ip });
  return c.json({ id, slug, ip, status: "provisioning" });
});

app.get("/v1/agents", auth, async (c) => {
  return c.json(await db.query("SELECT * FROM agents WHERE account_id = $1", [id]));
});

app.delete("/v1/agents/:id", auth, async (c) => {
  await ssh(agent.ip, "bash /home/agent/backup.sh");
  await hetzner.deleteServer(agent.server_id);
  await db.delete("agents", id);
  return c.json({ ok: true });
});

app.post("/v1/agents/:id/actions/:action", auth, async (c) => {
  switch (action) {
    case "start":  await hetzner.poweron(server_id); break;
    case "stop":   await hetzner.poweroff(server_id); break;
    case "backup": await ssh(ip, "bash /home/agent/backup.sh"); break;
  }
});

app.post("/v1/agents/:id/ssh", auth, async (c) => {
  const result = await ssh(agent.ip, body.command);
  return c.json({ output: result });
});
```

Dual auth (Stytch sessions for dashboard, API keys for devs) can be added later with one middleware change. Same routes, same logic.

---

## 12. Skills

### Shipped in image repo (free for all customers)

| Skill | Purpose |
|-------|---------|
| brand-analyzer | Scrape website + socials → generate brand profile |
| social-drafter | Draft platform-specific posts from brand context |
| competitor-tracker | Monitor competitor social activity |
| market-research | Industry trends + audience insights |
| seo-auditor | Technical SEO audit |
| keyword-researcher | Discover target keywords |
| content-seo | Optimize content for SEO |

### Updated via git push
Skills live in the Git repo → symlinked into each customer's workspace. Update the repo, all customers get the new version on next restart.

### Future: premium skills
Can gate skills by checking plan tier in AGENTS.md or via a simple check script. No database needed — the plan info can be written to a file on the VPS at provisioning time.

---

## 13. Storage

- **Default**: 40GB NVMe (included with CX23)
- **Expansion**: Hetzner Volumes (€4.59/100GB), attachable via API
- **Backups**: tar + upload to Supabase Storage (cron on VPS)

---

## 14. Pricing

| | Starter | Pro | Business |
|---|---------|-----|----------|
| **Price** | €9.99/mo | €14.99/mo | €29.99/mo |
| **Resources** | 2 vCPU, 4GB, 40GB | 2 vCPU, 4GB, 100GB | 2 vCPU, 4GB, 256GB |
| **LLM** | Included (limited) | Included (higher) | BYOK |
| **Skills** | All shipped skills | All + future pro | All + custom upload |
| **Channels** | Webchat + 1 | Webchat + 3 | Unlimited |

### Unit Economics

| | Starter | Pro | Business |
|---|---------|-----|----------|
| Revenue | €9.99 | €14.99 | €29.99 |
| VPS (CX23) | €4.49 | €4.49 | €4.49 |
| Volume | — | €2.75 | €10.00 |
| LLM | ~€1.00 | ~€2.00 | €0 (BYOK) |
| APIs | ~€0.50 | ~€1.00 | ~€1.00 |
| LB share | ~€0.50 | ~€0.50 | ~€0.50 |
| **Cost** | **€6.49** | **€10.74** | **€15.99** |
| **Margin** | **35%** | **28%** | **47%** |

---

## 15. User Journey

### Onboarding
1. Sign up at tevy2.ai
2. Enter website URL + social links
3. Connect Telegram (provide bot token)
4. Agent provisions (~60 seconds)
5. Agent scrapes brand → sends first message: "Hey! Here's what I found about your brand..."

### Day-to-Day
Chat with your agent via Telegram or webchat. It drafts posts, tracks competitors, does SEO audits, and manages your content calendar — all through conversation.

### Dashboard (see Section 20 for full breakdown)

---

## 16. Dev Platform Future

The backend is already a generic agent provisioning API. To become a dev platform:
1. Add API key auth to the existing auth middleware
2. Add a "Generate API Key" button to the dashboard
3. Publish API docs

Same routes, same Hetzner calls, same everything. Tevy2 dashboard is just one consumer. External devs use the same API with API keys instead of Stytch sessions.

---

## 17. Dev Platform Transition

The Tevy2 backend IS the dev platform. No refactor needed — just expose what's already there.

### What exists today (Tevy2 backend)

```
POST   /v1/agents                    → hetzner.createServer()
GET    /v1/agents                    → list customer's agents
GET    /v1/agents/:id                → get agent status
DELETE /v1/agents/:id                → backup + delete VPS
POST   /v1/agents/:id/actions/start  → hetzner.poweron()
POST   /v1/agents/:id/actions/stop   → hetzner.poweroff()
POST   /v1/agents/:id/actions/backup → ssh: tar + upload
GET    /v1/agents/:id/files/*        → ssh: cat file
PUT    /v1/agents/:id/files/*        → ssh: write file + restart
POST   /v1/agents/:id/ssh            → ssh: run command
```

Auth: Stytch session tokens (dashboard users).

### What changes to become a dev platform

**Add ONE middleware, ONE table column, ONE new route:**

```sql
-- Add to accounts table:
ALTER TABLE accounts ADD COLUMN api_key_hash TEXT;
```

```typescript
// auth.ts — add 4 lines to existing middleware:
if (authHeader?.startsWith("Bearer tvk_")) {
  const account = await db.query(
    "SELECT * FROM accounts WHERE api_key_hash = $1", [hash(key)]
  );
  c.set("account", account);
}
```

```typescript
// ONE new route:
app.post("/v1/auth/api-keys", sessionAuth, async (c) => {
  const key = `tvk_${crypto.randomBytes(32).toString("hex")}`;
  await db.query("UPDATE accounts SET api_key_hash = $1 WHERE id = $2", [hash(key), account.id]);
  return c.json({ key }); // shown once, never stored in plain text
});
```

**That's it.** Same routes, same Hetzner calls, same SSH commands. Devs use API keys instead of Stytch sessions.

### Dev platform API (same as Tevy2 backend)

```
# Create an agent
curl -X POST https://api.tevy2.ai/v1/agents \
  -H "Authorization: Bearer tvk_abc123..." \
  -d '{
    "slug": "my-research-bot",
    "name": "Research Agent",
    "soul_md": "You are a crypto research analyst...",
    "agents_md": "Read SOUL.md on every session...",
    "skills": ["web-search", "market-research"],
    "keys": { "telegram_token": "bot456:DEF..." }
  }'

# Check status
curl https://api.tevy2.ai/v1/agents/abc-123 \
  -H "Authorization: Bearer tvk_abc123..."

# Read a file from the agent
curl https://api.tevy2.ai/v1/agents/abc-123/files/workspace/MEMORY.md \
  -H "Authorization: Bearer tvk_abc123..."

# Write a file
curl -X PUT https://api.tevy2.ai/v1/agents/abc-123/files/workspace/SOUL.md \
  -H "Authorization: Bearer tvk_abc123..." \
  -d '{"content": "You are a helpful assistant..."}'

# Install a skill
curl -X POST https://api.tevy2.ai/v1/agents/abc-123/ssh \
  -H "Authorization: Bearer tvk_abc123..." \
  -d '{"command": "clawhub install market-research"}'

# Stop the agent
curl -X POST https://api.tevy2.ai/v1/agents/abc-123/actions/stop \
  -H "Authorization: Bearer tvk_abc123..."
```

### Timeline

| When | What | Effort |
|------|------|--------|
| Day 1 (now) | Tevy2 backend serves dashboard via Stytch auth | Already built |
| Day 1 (now) | Same routes work for dev platform — just needs API key auth | ~2 hours |
| Week 2 | Add "Generate API Key" button to dashboard Settings tab | ~1 hour |
| Week 2 | Write API docs (the routes already exist) | ~4 hours |
| Month 2 | Add usage metering + Stripe usage-based billing for devs | ~1 week |

### Two products, one backend

```
tevy2.ai (consumer)              api.tevy2.ai (dev platform)
├── Dashboard (Next.js)          ├── Same API, same routes
├── Auth: Stytch magic link      ├── Auth: API key (tvk_...)
├── Fixed plans: €9.99-29.99     ├── Usage-based pricing
├── Marketing template only      ├── Any template or custom
└── Calls /v1/agents/*           └── Calls /v1/agents/*
         ↘                      ↙
          Same Railway backend
          Same Hetzner VPSes
          Same everything
```

---

## 18. Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | Next.js + Tailwind on Netlify | Free |
| Auth | Stytch (magic link) | Free tier |
| Backend | Hono on Railway | ~€5/mo |
| Database | Supabase (2 tables) | Free tier |
| Agent VPS | Hetzner CX23 per customer | €4.49/customer/mo |
| Load Balancer | Hetzner LB | €5.49/mo |
| AI Engine | OpenClaw (native on VPS) | Free (OSS) |
| LLM | Anthropic Claude | Usage-based |
| Web Search | Tavily API | Usage-based |
| Image repo | GitHub (tevy-agent-image) | Free |
| Domain | tevy2.ai | Registered ✅ |

---

## 18. Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Hosting | Hetzner CX23, 1:1 VPS | Simple, secure, no orchestration |
| Image | Git repo + Hetzner snapshot | Snapshot = just Ubuntu+Node. Git repo = everything else |
| Updates | git push → SSH update.sh | No rebuild needed for 95% of updates |
| Skills | Symlinked from /opt/tevy/skills/ | Updated via git pull, no per-customer management |
| State management | VPS is source of truth | No complex DB. OpenClaw manages its own state |
| Database | 2 Supabase tables | accounts + agents. That's it. |
| Backend | Thin Hetzner API proxy | ~50 lines of logic + auth + billing |
| Portability | tar ~/.openclaw/ → scp → untar | 5 commands to migrate |
| Containers | None | Not needed. Native install is simpler |
| Fly.io | Replaced | Cost + control + simplicity |
| Clawster | Shelved | Focus on Tevy2 |

## 19. Open Questions

1. Hetzner account — Boss needs to create + share API token
2. LLM model — Sonnet vs Opus for default instances?
3. Stripe account — needed for billing
4. Postiz account — needed for social posting
5. Demo business — which brand to test with?
6. X.com developer account — apply under Brain&Bot?

---

---

## 20. Dashboard Architecture

### What Already Exists (don't rebuild)

**OpenClaw Built-in Control UI** (port 18789, on every VPS):
- Chat with agent (streaming, tool calls, file attachments)
- Channel management (Telegram/WhatsApp/Discord/Slack status, QR login, per-channel config)
- Sessions list with per-session model/thinking overrides
- Cron jobs (create/edit/run/enable/disable + run history)
- Skills (status, enable/disable, install, API key updates)
- Config editor (view/edit openclaw.json with schema validation + form rendering)
- Config apply + restart with validation
- Live log tail with filter/export
- Update (package/git update + restart)
- Device pairing security for remote access
- i18n (en, zh-CN, zh-TW, pt-BR, de, es)

**Mission Control** (community, robsannaa/openclaw-mission-control):
- All of the above PLUS:
- Dashboard overview (live agent status, gateway health, system resources)
- Tasks Kanban board (Backlog/In Progress/Review/Done)
- Usage/cost tracking with charts (tokens per model per agent)
- Agent org chart with subagent management
- Memory editor (view/edit long-term memory + daily journals + vector search)
- Models manager (credentials, fallback chains, switch per agent)
- Doctor (diagnostics + one-click fixes)
- Terminal (full CLI in browser, multiple tabs)
- Document explorer with Cmd+K semantic search
- Security audits + permissions + credentials management
- Tailscale integration
- Key philosophy: "NOT a separate platform. A transparent window into OpenClaw."

### What We Build (Tevy2-specific, our value-add)

Our existing dashboard has these tabs, which we KEEP and OWN:

| Tab | What it does | Data source |
|-----|-------------|-------------|
| 🏠 **Home** | Overview: agent status, quick stats, recent activity, webchat embed | Hetzner API (status) + SSH (read memory files) |
| 🎯 **Brand** | Brand profile editor: business name, website, socials, brand voice, audience persona, value prop. Editable rich form. | SSH: read/write `memory/brand-profile.md` |
| 📅 **Calendar** | Content calendar: view scheduled/published posts, drag to reschedule, create new | SSH: read/write `memory/content-calendar.md` |
| 📊 **Analytics** | Post performance across platforms, engagement trends, best times | SSH: read `memory/analytics/` or API to social platforms |
| 🔍 **Research** | Market research reports, competitor tracking, trend alerts | SSH: read `memory/research/*.md` + `memory/competitors.md` |
| 🔎 **SEO** | SEO audit results, keyword opportunities, content optimization recs | SSH: read `memory/seo/audit.md` + `memory/seo/keywords.md` |
| 📁 **Files** | Browse and edit the customer workspace files directly: memory docs, uploaded brand assets, generated research, decision logs | SSH: list/read/write within workspace only |
| ⚙️ **Settings** | Start/stop agent, delete instance, connection status, Telegram config, billing | Hetzner API + SSH + Stripe |

### What We Take from OpenClaw UI (embed, don't rebuild)

For "advanced" agent management, we embed the OpenClaw Control UI directly:

| Feature | Source | How we integrate |
|---------|--------|-----------------|
| Chat with agent | OpenClaw Control UI | Embed webchat widget in Home tab + dedicated /chat page |
| Skills management | OpenClaw Control UI | Link to Control UI skills page from Settings |
| Channel config | OpenClaw Control UI | Link to Control UI channels page from Settings |
| Config editor | OpenClaw Control UI | Link to Control UI config page (advanced users only) |
| Cron jobs | OpenClaw Control UI | Link to Control UI cron page from Settings |
| Logs | OpenClaw Control UI | Link to Control UI logs page from Settings |

### How embedding works

Each customer's VPS runs the OpenClaw Control UI at port 18789. We expose it through the load balancer:

```
customer-slug.agents.tevy2.ai        → VPS port 18789 (Control UI + WebSocket)
tevy2.ai/dashboard                   → Our Next.js app (Netlify)
```

The dashboard embeds the Control UI webchat via iframe or proxied WebSocket:

```tsx
// Home tab — embedded webchat
<iframe 
  src={`https://${instanceData.slug}.agents.tevy2.ai/chat`}
  className="w-full h-96 rounded-lg border"
/>
```

For advanced settings, we link out:
```tsx
// Settings tab — advanced section
<a href={`https://${instanceData.slug}.agents.tevy2.ai`} target="_blank">
  Open Agent Control Panel →
</a>
```

### Dashboard data flow

```
Dashboard reads/writes agent data via SSH (through backend):

GET  /v1/agents/:id/files/workspace/memory/brand-profile.md     → Brand tab
PUT  /v1/agents/:id/files/workspace/memory/brand-profile.md     → Brand tab save
GET  /v1/agents/:id/files/workspace/memory/content-calendar.md  → Calendar tab
GET  /v1/agents/:id/files/workspace/memory/competitors.md       → Research tab
GET  /v1/agents/:id/files/workspace/memory/seo/audit.md         → SEO tab
GET  /v1/agents/:id/files/workspace/memory/research/             → Research tab (list)

All reads: Backend SSHs into VPS, reads file, returns content
All writes: Backend SSHs into VPS, writes file, optionally restarts gateway
```

### Potential Feature: Files / Folder Tab

Add a workspace browser tab so the customer can inspect the real files their agent is using.

Purpose:

- make the workspace visible instead of hiding it behind product-specific forms only
- let advanced users inspect memory, research, assets, and decision logs directly
- reinforce that the workspace is the source of truth

Initial scope:

- browse folders under `/home/agent/.openclaw/workspace`
- open text files for viewing/editing
- inspect uploaded assets such as logos, PDFs, screenshots, and brand files
- allow edits to customer-owned workspace files only

Examples of visible paths:

- `memory/brand-profile.md`
- `memory/content-calendar.md`
- `memory/research/`
- `memory/decisions/`
- `brand-assets/`

Guardrails:

- workspace only — no browsing of the full VPS filesystem
- no access to `/opt/tevy`
- no access to SSH config, systemd units, package directories, or other system files
- no path traversal (`..`) or absolute-path access

What is needed on the backend:

- a safe directory-listing endpoint such as:
  - `GET /v1/agents/:id/tree/*`
- response should return structured entries:
  - `name`
  - `path`
  - `type` (`file` or `dir`)
  - optional `size`
  - optional `modifiedAt`
- reuse existing read/write endpoints for opening and saving files
- optionally add later:
  - create file/folder
  - rename
  - delete
  - download asset

Implementation note:

- this should be implemented as a workspace browser, not a general remote filesystem explorer
- the backend should continue enforcing ownership through the Tevy account → agent mapping before any file operation

### What we DON'T build

- ❌ Our own chat implementation (use OpenClaw's)
- ❌ Our own skills manager (use OpenClaw's)
- ❌ Our own config editor (use OpenClaw's)
- ❌ Our own cron scheduler (use OpenClaw's)
- ❌ Our own log viewer (use OpenClaw's)
- ❌ Our own channel manager (use OpenClaw's)
- ❌ Our own auth for the agent itself (use OpenClaw's gateway token)

### MVP dashboard scope

**Week 1 (ship immediately):**
- Home tab: agent status + embedded webchat
- Settings tab: start/stop/delete + Telegram connection status
- Link to full Control UI for everything else

**Week 2-3:**
- Brand tab: read/write brand-profile.md via rich form
- Calendar tab: read/write content-calendar.md
- Research tab: display research/*.md files

**Month 2+:**
- Analytics tab: social platform API integration
- SEO tab: display audit results
- Skills marketplace in dashboard

---

*Created: 2026-03-04 | Last updated: 2026-03-16 00:06 UTC*
