# Agent Image Changelog

All notable changes to the Tevy agent image.

Format: version, date, what changed, migration notes.

---

## [0.0.2] — 2026-03-23

### Added
- `templates/AGENTS.md` — full agent behaviour with content calendar, decision logging, social posting rules
- `templates/SOUL.md` — marketing concierge personality with daily check-in
- `templates/USER.md` — boss profile template
- `templates/HEARTBEAT.md` — periodic task schedule
- `templates/memory/decisions/decision-log.md` — durable business decisions tracker
- `templates/memory/analytics/.gitkeep` — analytics reports directory
- `templates/memory/research/.gitkeep` — market research directory
- `templates/memory/seo/.gitkeep` — SEO audit results directory
- `skills/tevy-sync/` — dashboard sync skill (config sync from dashboard)
- `scripts/update.sh` — git pull + openclaw update + restart

### Changed
- Switched from Docker-only to VPS-native deployment (Hetzner CX23)
- Templates now copied at provision time (not symlinked) — customer owns them after first boot
- Skills symlinked from /opt/tevy/skills/ into workspace

### Migration
- N/A (first VPS-native version)

---

## [0.0.1] — 2026-03-05

### Added
- Initial Docker image structure
- `Dockerfile` based on `node:22-slim`
- `entrypoint.sh` for Docker container startup
- Basic `README.md`
- Environment variable based configuration

### Notes
- Docker-based architecture (later replaced by VPS-native in 0.0.2)
- Used for local dev and initial testing only

---

## [Unreleased] — Next

### Planned
- WhatsApp channel support in cloud-init (auto-configure if phone number provided)
- Marketing skills bundle (market-research, copywriting, social-content, seo-audit)
- `memory/activity-log.md` template with format spec
- Brave Search API key in shared-keys.env
- Image generation tool integration (Higgsfield or similar)
- Email outreach via AgentMail
- Multi-project support
- Escalation automation (deadline reminders via chat)
