# Tevy2 Agent Workspace Specification

> Defines the file system structure on each agent VPS and how the dashboard maps to it.

## File System Layout

```
/home/agent/.openclaw/
├── openclaw.json                          # Gateway config (channels, auth, plugins)
├── agents/main/agent/auth-profiles.json   # API keys (Anthropic, etc.)
└── workspace/
    ├── SOUL.md                            # Agent personality & behavior (template at boot)
    ├── AGENTS.md                          # Behavior rules (template at boot)
    ├── USER.md                            # Business owner info
    ├── IDENTITY.md                        # Bot identity (name, emoji, vibe)
    ├── TOOLS.md                           # Tool-specific notes
    ├── HEARTBEAT.md                       # Periodic task checklist
    │
    ├── memory/
    │   ├── brand-profile.md               # Brand voice, audience, value prop, socials
    │   ├── competitors.md                 # Tracked competitors + analysis
    │   ├── content-calendar.md            # Scheduled posts + backlog
    │   ├── activity-log.md                # Bot activity log (NEW — dashboard pulls from here)
    │   ├── connected-accounts.md          # Social accounts + credentials status (NEW)
    │   ├── YYYY-MM-DD.md                  # Daily session notes
    │   └── research/                      # Market intel reports
    │       └── *.md
    │
    └── assets/                            # Uploaded brand assets (NEW)
        ├── logo.png
        ├── brand-colors.json
        └── *.{png,jpg,svg}
```

## Dashboard ↔ File System Mapping

### Home Tab
| UI Element | Source | Read/Write |
|---|---|---|
| Agent status | Hetzner API (`getMachine`) + SSH (`gatewayStatus`) | Read |
| Recent activity | `memory/activity-log.md` (last 10 entries) | Read |
| Chat box (bottom) | OpenClaw gateway WebSocket / Control UI embed | Read/Write |

### Brand Tab
| UI Element | Source | Read/Write |
|---|---|---|
| Business name | `memory/brand-profile.md` → `## Business` → `**Name:**` | Read/Write |
| Website URL | `memory/brand-profile.md` → `## Business` → `**Website:**` | Read/Write |
| Industry | `memory/brand-profile.md` → `## Business` → `**Industry:**` | Read/Write |
| Brand voice / tone | `memory/brand-profile.md` → `## Brand Voice` | Read/Write |
| Target audience | `memory/brand-profile.md` → `## Target Audience` | Read/Write |
| Social accounts list | `memory/brand-profile.md` → `## Social Presence` | Read/Write |
| Brand assets (logo, images) | `assets/` directory | Write (upload via SSH) |
| Posting goal | `memory/brand-profile.md` → `## Posting Goal` | Read/Write |

Social accounts should be dynamic — user can add/remove via dropdown:
- Platform choices: X/Twitter, Instagram, LinkedIn, Reddit, TikTok, Facebook, YouTube
- Each entry: platform type + handle/URL
- Saved back to `## Social Presence` in brand-profile.md

### Calendar Tab
| UI Element | Source | Read/Write |
|---|---|---|
| Scheduled posts | `memory/content-calendar.md` → week sections | Read |
| Post status (pending/approved/published) | `memory/content-calendar.md` → `**Status:**` field | Read/Write |
| Backlog ideas | `memory/content-calendar.md` → `## Upcoming Ideas` | Read |
| Approve post action | Updates status in `content-calendar.md` | Write |

### Market Intel Tab (was "Research")
| UI Element | Source | Read/Write |
|---|---|---|
| Tracked competitors | `memory/competitors.md` → sections | Read |
| Add/remove competitor | Updates `memory/competitors.md` | Write |
| Research reports | `memory/research/*.md` | Read |
| Last updated timestamp | Parsed from file footer | Read |

### Settings Tab
| UI Element | Source | Read/Write |
|---|---|---|
| Agent start/stop/delete | Hetzner API | Write |
| Telegram connection | `openclaw.json` → `channels.telegram` | Read |
| Connected tools/APIs | `memory/connected-accounts.md` | Read/Write |

## Activity Log Specification

File: `memory/activity-log.md`

The bot maintains a running log of significant actions. The dashboard shows the latest entries.

### Format
```markdown
# Activity Log

## 2026-03-20

- **22:52** 📅 Created content calendar — 1 post scheduled for Mon Mar 23 (Twitter/X)
- **22:52** 🔍 Competitor research — identified 5 direct + 3 indirect competitors
- **22:50** 📝 Updated brand profile from website analysis (bit10.app)
- **22:48** 👋 First conversation with zeya — onboarding complete
```

### Behavior Rule (add to AGENTS.md)
```markdown
## Activity Logging
After completing any significant action, append a one-line entry to `memory/activity-log.md`:
- Format: `- **HH:MM** <emoji> <action summary>`
- Emojis: 📅 calendar, 🔍 research, 📝 content, 🚀 published, ⚙️ config, 📊 analytics, 🎨 brand
- Log: content drafts, research, calendar updates, config changes, published posts
- Don't log: casual chat, greetings, minor clarifications
- Keep entries to one line. Details go in daily notes or specific files.
```

## Connected Accounts & Tools

File: `memory/connected-accounts.md`

Three types of connections:

### 1. Brand Accounts (official business accounts)
The business's own social media accounts. Used for publishing and analytics.
```markdown
## Brand Accounts
- Twitter/X: @bit10app (connected ✅ | publishing: ready)
- Instagram: @bit10app (not connected ❌)
```

### 2. Bot-Controlled Accounts (optional)
Accounts the bot operates on behalf of the business (could be the same as brand accounts).
```markdown
## Bot Accounts
- Twitter/X: @bit10app (cookies: valid ✅ | last checked: 2026-03-20)
```

### 3. Tool Integrations (API services)
Third-party tools the bot can use.
```markdown
## Tools & Integrations
- Brave Search API: ❌ not configured (needed for live research)
- Higgsfield Image Gen: ❌ not configured
- Tavily Search: ✅ configured
- AgentMail: ❌ not configured
```

## Dashboard Presentation Notes

### What NOT to have as standalone tabs
- **SEO**: Not a tab — surface as a suggested prompt ("Run an SEO audit") or under Market Intel
- **Analytics**: Future tab — needs platform API integration first

### Chat Box (Home tab, bottom)
- Style: terminal-like box similar to OpenClaw TUI / Claude Code / Codex
- Shows recent messages between user and bot
- Input field at bottom for sending messages
- Connects via OpenClaw gateway WebSocket (Control UI embed or custom)

### Social Account Setup
- Don't pre-populate X.com, Instagram, etc. as empty boxes
- Let user click "+ Add Account" → dropdown (X/Twitter, Instagram, LinkedIn, Reddit, TikTok, Facebook, YouTube) → input handle/URL
- Each connected account shows status: connected ✅ / not connected ❌ / cookies expired ⚠️
- "Connect" button guides them through auth (cookie-based for browser accounts, API key for tools)

---

*Created: 2026-03-20 | Reflects live bit10 test deployment*
