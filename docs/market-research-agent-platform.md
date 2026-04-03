# Market Research Report: "Railway for AI Agents" — Tevy2 Backend Spin-Out

**Date:** 2026-03-30
**Prepared for:** Mohammed (Boss)
**Status:** DECISION-READY

---

## Executive Summary

The AI agents market hit **$7.84B in 2025** and is projected at **$10.91B in 2026** (MarketsandMarkets). 60% of Fortune 500 companies now use some form of multi-agent orchestration. Yet a critical gap exists: **no one owns the "deploy and manage persistent AI agents for your users via API" layer** in the way Railway owns "deploy web apps." The market is fragmented between orchestration frameworks (LangGraph, CrewAI) that don't handle infrastructure, and compute platforms (Railway, Modal, Fly.io) that don't understand agents. Tevy2's backend is already 70% of a developer platform. The opportunity is real, the timing is tight, and the competition is coming fast.

**Verdict: CONDITIONAL ENTER** — worth pursuing as a dual-track with Tevy2, but only if execution starts within 4 weeks.

---

## PART 1: Tevy2 Backend — What Already Exists

### Architecture Review

The Tevy2 backend is a **Hono (TypeScript) API running on Railway**, backed by **Supabase (2 tables)**, provisioning **1:1 Hetzner CX23 VPSes per customer**. Each VPS runs an OpenClaw agent instance with full VM isolation.

### What's Already Built (Maps Directly to Dev Platform)

| Component | Status | Dev Platform Relevance |
|-----------|--------|----------------------|
| **Agent provisioning API** (`POST /api/agents`) | ✅ Working | Core primitive — create agent via API |
| **Agent lifecycle** (start/stop/delete/backup) | ✅ Working | Essential CRUD operations |
| **Hetzner infra abstraction** (`hetzner-infra.ts`) | ✅ Working | Clean adapter pattern, swappable |
| **Cloud-init provisioning** (`cloud-init.ts`) | ✅ Working | Configurable per-agent setup |
| **SSH management layer** (`ssh.ts`) | ✅ Working | File read/write, command exec, gateway control |
| **File API** (GET/PUT `/agents/:id/files/*`) | ✅ Working | Workspace management for developers |
| **SSH command execution** (`POST /agents/:id/ssh`) | ✅ Working | Arbitrary command execution on agent VPS |
| **Boot status polling** (`GET /agents/:id/boot-status`) | ✅ Working | Provisioning progress tracking |
| **Runtime info** (OpenClaw version, gateway status) | ✅ Working | Health monitoring |
| **Agent image update** via SSH | ✅ Working | Remote agent updates |
| **Stytch session auth** | ✅ Working | Dashboard auth (needs API key auth addition) |
| **Database schema** (accounts + agents) | ✅ Working | Already has `api_key_hash` column! |
| **Path traversal protection** | ✅ Working | Security baseline |
| **Dangerous command blocking** | ✅ Working | Safety rails |
| **Configurable SOUL.md / AGENTS.md templates** | ✅ Working | Customizable agent personality |
| **Multi-channel support** (Telegram, webchat) | ✅ Working | Channel flexibility |
| **Skill installation** via SSH | ✅ Working | Extensible agent capabilities |

### Critical Detail: API Key Auth Is Pre-Wired

The database schema **already includes `api_key_hash`** on the accounts table:
```sql
api_key_hash TEXT,  -- For dev platform API key auth
```

The PRD explicitly describes the dev platform transition as adding ~4 lines to the auth middleware. This is not hypothetical — it's architecturally planned.

### What's Missing for a Developer Platform

| Component | Effort | Priority |
|-----------|--------|----------|
| **API key authentication middleware** | 2 hours | P0 — blocks everything |
| **API key generation endpoint** | 2 hours | P0 |
| **Multi-agent per account** (currently limited to 1) | 4 hours | P0 — devs need many agents |
| **Usage metering** (API calls, compute hours) | 1 week | P1 |
| **Usage-based billing** (Stripe metered billing) | 1 week | P1 |
| **Developer dashboard** (API key management, usage) | 2 weeks | P1 |
| **API documentation** (OpenAPI/Swagger) | 3 days | P1 |
| **SDK** (TypeScript/Python) | 1 week each | P2 |
| **Rate limiting** | 2 days | P1 |
| **Webhook callbacks** (agent status changes) | 3 days | P2 |
| **Custom agent templates** (beyond marketing) | 3 days | P2 |
| **Multi-region support** | 1 week | P3 |
| **Log streaming API** | 3 days | P2 |
| **Agent-to-agent communication** | 2 weeks | P3 |

### Infra Provider Abstraction

The `hetzner-infra.ts` file implements a clean adapter interface:
- `createMachine()`, `getMachine()`, `startMachine()`, `stopMachine()`, `deleteMachine()`
- `execInMachine()`, `readFileFromMachine()`, `writeFileToMachine()`

This could be extended to support Docker, Fly.io, AWS, or any other compute backend. The abstraction is already there — it just needs additional implementations.

---

## PART 2: Competitive Landscape

### Category 1: Agent Orchestration Frameworks (Not Infrastructure)

These help you **build** agents but don't **host** them.

#### LangGraph Platform (LangChain)
- **URL:** https://www.langchain.com/langgraph-platform
- **What:** Managed deployment of LangGraph agents with state management, streaming, task queues
- **Pricing:**
  - Developer (self-hosted): Free, 100K nodes/month
  - Plus (cloud): $39/user/month + $0.001/node + standby charges ($0.0007-$0.0036/min)
  - Enterprise: Custom
- **Target:** Developers already using LangChain/LangGraph
- **Deploy model:** Serverless functions, not persistent VMs
- **Limitations:** Tied to LangGraph framework; no generic agent hosting; no per-user isolation; complex pricing
- **Gap:** You can't give each of YOUR users their own agent — it's workflow execution, not multi-tenant agent hosting

#### CrewAI Enterprise
- **URL:** https://crewai.com/pricing
- **What:** Visual editor + cloud deployment for multi-agent workflows
- **Pricing:**
  - Basic: Free (50 executions/month)
  - Professional: $25/month (100 executions, $0.50/additional)
  - Enterprise: Custom (up to 30K executions, VPC deploy, SOC2)
- **Target:** Teams building multi-agent workflows
- **Deploy model:** CrewAI cloud (managed) or self-hosted K8s
- **Limitations:** Workflow-oriented, not persistent agent hosting; execution-based not always-on
- **Gap:** No concept of "spin up a persistent agent for user X"

#### Relevance AI
- **URL:** https://relevanceai.com
- **What:** Low-code platform to build and deploy AI agent workforce
- **Pricing:** Credits-based — Actions (what agents do) + Vendor Credits (AI model costs, passed through at cost)
- **Target:** Business teams, low-code users
- **Deploy model:** Fully managed SaaS
- **Limitations:** Opaque credit system; not developer-first; no API for programmatic agent provisioning
- **Gap:** Platform for building YOUR agents, not for giving YOUR USERS agents

### Category 2: Compute Platforms (Not Agent-Aware)

These provide **infrastructure** but no agent abstractions.

#### Railway
- **URL:** https://railway.app
- **Pricing:** Usage-based, ~$5-50/month per service
- **Strengths:** One-click GitHub deploy, persistent volumes, integrated databases
- **Limitations:** No GPU, no agent-specific features, no per-user isolation model
- **Gap:** You deploy your whole app, not agents for each user. No concept of multi-tenant agent management.

#### Modal
- **URL:** https://modal.com
- **Pricing:** Free tier ($30/month credits), Team $250/month. Per-second GPU billing.
- **Strengths:** Sub-4s cold starts, GPU access (A100/H100), Python-native
- **Limitations:** Python only, ephemeral volumes, no persistent always-on agents
- **Gap:** Great for batch/inference, terrible for persistent stateful agents

#### Fly.io
- **URL:** https://fly.io
- **Pricing:** Usage-based, no free tier. VMs from ~$1.94/month. GPUs from $1.35/hr.
- **Strengths:** Global edge, persistent volumes, GPU support, micro-VMs
- **Limitations:** Complex pricing, removed free tier
- **Gap:** Raw infrastructure — you build all agent management yourself

#### Replicate
- **URL:** https://replicate.com
- **Pricing:** Per-second compute billing
- **Strengths:** Model hosting, easy inference API
- **Limitations:** Model inference only, no persistent agents, no state
- **Gap:** Run predictions, not agents

### Category 3: Cloud Provider Agent Services (Enterprise Only)

#### AWS Bedrock Agents
- **Pricing:** Per-token + per-tool-invocation (no orchestration charge)
- **Target:** AWS-native enterprises
- **Deploy model:** Serverless, tied to Lambda/S3/DynamoDB
- **Limitations:** 5+ internal model calls per query (hidden cost), steep IAM learning curve, AWS lock-in
- **Gap:** Enterprise-only, no indie developer story, no per-user agent isolation

#### Google Vertex AI Agent Builder
- **Pricing:** $0.0864/vCPU-hour runtime, $0.25/1K session events, code execution billing added Feb 2026
- **Target:** GCP-native teams
- **Deploy model:** Managed serverless
- **Limitations:** Pricing changed significantly late 2025, requires GCP expertise
- **Gap:** Visual builder for YOUR agents, not for deploying agents for YOUR users

#### Azure AI Foundry Agent Service
- **Pricing:** No agent orchestration charge, 1,400+ action connectors
- **Target:** Microsoft ecosystem enterprises
- **Deploy model:** Managed, SharePoint/Fabric integrated
- **Limitations:** Deep Microsoft lock-in
- **Gap:** Same as above — enterprise tool, not developer platform

### Category 4: Emerging Agent Infrastructure (Closest Competitors)

#### Nebula (nebula.gg)
- **What:** Zero-config managed agent platform with built-in scheduling, integrations, memory
- **Pricing:** Free tier + usage-based
- **Target:** Developers wanting managed agents
- **Deploy model:** Fully managed (you don't control infra)
- **Limitation:** Black box, no VM isolation, no per-user agent provisioning API

#### MCPWorks (mcpworks.io)
- **What:** Open-source agent runtime — agents write code in sandbox, handles scheduling/webhooks/encrypted state/communication channels
- **License:** BSL 1.1 (→ Apache 2.0 in 2030), self-hostable
- **Key insight from their Reddit post:** "A huge percentage of useful agents don't need an LLM at all" and "communication channels are a required killer feature"
- **Stars:** Small/new project
- **Gap:** Runtime focus, not multi-tenant provisioning API

#### Aegra (github.com/ibbybuilds/aegra) — 735 ⭐
- **What:** Open-source self-hosted LangGraph Platform alternative
- **License:** Apache 2.0
- **Deploy model:** Self-hosted with PostgreSQL
- **Limitation:** LangGraph-specific, not generic agent hosting

#### CloudShip Station (github.com/cloudshipai/station) — 391 ⭐
- **What:** Open-source runtime for deploying multi-agent teams, git-backed, self-hosted
- **License:** Open source
- **Deploy model:** Self-hosted, Jaeger tracing
- **Limitation:** Multi-agent orchestration focus, not per-user agent provisioning

#### Coze Studio (github.com/coze-dev/coze-studio) — 20.4K ⭐
- **What:** AI agent development platform with visual tools (by ByteDance)
- **Deploy model:** Platform-managed
- **Limitation:** Tied to Coze ecosystem, no API for programmatic per-user agent provisioning

#### FastGPT (github.com/labring/FastGPT) — 27.6K ⭐
- **What:** Knowledge-based platform on LLMs, data processing, RAG
- **Deploy model:** Self-hosted or cloud
- **Limitation:** Knowledge/RAG focus, not agent lifecycle management

### The Market Gap — Visualized

```
                    Agent-Aware
                        ↑
                        |
    CrewAI/LangGraph    |    ??? (THE GAP)
    (framework only,    |    (API to spin up isolated
     no hosting)        |     agents for YOUR users)
                        |
   ─────────────────────┼────────────────────────────→ Multi-Tenant
                        |                              Per-User Isolation
    Modal/Railway       |    Hetzner/AWS bare
    (generic compute,   |    (DIY everything)
     not agent-aware)   |
                        ↓
```

**Nobody occupies the top-right quadrant.** That's the "Railway for AI Agents" opportunity.

---

## PART 3: Demand Validation

### Reddit Signals

**Key finding from r/AIStartupAutomation:** MCPWorks post describes building essentially the same thing — multi-tenant agent runtime with scheduling, webhooks, communication channels. Their insight: "The moment an agent can message you on Discord from your phone, the entire UX changes. You stop thinking of it as a tool and start treating it as a colleague."

**Key finding from r/AIAgentsInAction:** Post about deploying OpenClaw on Azure VMs for persistent AI agents. Discussion around cloud-hosted vs local setups for "always-on behavior" — validates demand for managed persistent agents.

**General Reddit themes (across r/LocalLLaMA, r/SaaS, r/selfhosted):**
- Recurring questions about "how to give each of my users their own AI agent"
- Frustration with ephemeral agent execution — developers want persistent, stateful agents
- Interest in self-hosting for data isolation and control
- Pain point: going from working prototype to production deployment
- "Every AI agent tutorial ends the same way: a working prototype running on localhost" (from dev.to article, echoing Reddit sentiment)

### X/Twitter Signals

Based on search results and industry tracking:
- "Agent infrastructure" is a hot topic with significant VC interest
- Multiple founders building multi-tenant agent platforms (pre-product)
- Strong signal from AI-native SaaS builders wanting to embed agents in their products
- Emerging narrative: "agents are the new microservices" — every app will have them
- Recurring pain: "I built an agent, now where does it live?"

### GitHub Signals

| Project | Stars | Relevance |
|---------|-------|-----------|
| Coze Studio | 20.4K | Visual agent builder (ByteDance) — validates market |
| FastGPT | 27.6K | Knowledge platform — adjacent |
| Ruflo | 28.5K | Agent orchestration for Claude — validates demand |
| Aegra | 735 | Self-hosted LangGraph alternative — gap validation |
| CloudShip Station | 391 | Self-hosted multi-agent deploy — closest to our concept |
| MCPWorks | Small | Multi-tenant agent runtime — direct signal |

**Key observation:** The highest-starred projects are **agent builders** and **orchestrators**, not **agent hosting platforms**. The infrastructure layer is underserved.

### Demand Synthesis

**Strong demand signals:**
1. Every agent tutorial ends at localhost — deployment is unsolved
2. Developers building SaaS products want to give each user their own agent
3. Existing platforms force you to choose: framework lock-in OR raw infra
4. Multi-tenancy for agents is a repeated pain point with no clean solution
5. "Persistent agent with memory" is the desired end state, not "stateless function execution"

**Demand risks:**
1. Market is moving fast — window may close in 6-12 months
2. Cloud providers (AWS, Google, Azure) are adding agent features aggressively
3. Some developers may prefer to build on existing frameworks rather than new platforms

---

## PART 4: Technical Feasibility Assessment

### 1. What Already Exists That Maps to This Use Case

| Dev Platform Feature | Tevy2 Status | Coverage |
|---------------------|--------------|----------|
| Programmatic agent creation | ✅ API exists | 90% |
| Agent lifecycle management | ✅ start/stop/delete | 100% |
| Per-agent VM isolation | ✅ 1:1 VPS model | 100% |
| File management API | ✅ read/write workspace | 95% |
| Command execution | ✅ SSH exec | 100% |
| Agent health monitoring | ✅ runtime endpoint | 80% |
| Provisioning progress | ✅ boot-status polling | 90% |
| Agent updates | ✅ SSH-based update | 85% |
| Backup/restore | ✅ tar + SSH | 70% |
| Auth system | ✅ Stytch (needs API keys) | 60% |
| Database schema | ✅ includes api_key_hash | 80% |
| Infra abstraction | ✅ clean adapter pattern | 85% |

**Estimated existing coverage: ~70-75% of MVP**

### 2. What's Missing

**P0 (Blocks launch):**
- API key auth middleware (~2 hours)
- API key generation endpoint (~2 hours)
- Remove 1-agent-per-account limit (~4 hours)
- OpenAPI documentation (~3 days)
- Rate limiting (~2 days)

**P1 (Needed within month 1):**
- Usage metering infrastructure (~1 week)
- Usage-based Stripe billing (~1 week)
- Developer dashboard (~2 weeks)
- Custom agent templates (non-marketing) (~3 days)

**P2 (Month 2-3):**
- TypeScript SDK (~1 week)
- Python SDK (~1 week)
- Webhook callbacks for status changes (~3 days)
- Log streaming API (~3 days)
- Agent event API (messages received/sent) (~1 week)

**P3 (Month 3+):**
- Multi-region support (~1 week)
- Agent-to-agent communication (~2 weeks)
- Custom domain per agent (~3 days)
- Agent marketplace / template gallery (~2 weeks)

### 3. Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| **MVP (API-first)** | API keys, multi-agent, docs, rate limiting | **2 developer-weeks** |
| **Billing** | Metering + Stripe usage billing | **2 developer-weeks** |
| **Developer Dashboard** | Key management, usage, agent list | **3 developer-weeks** |
| **SDKs** | TypeScript + Python + examples | **2 developer-weeks** |
| **Polish** | Webhooks, logs, events, templates | **3 developer-weeks** |
| **TOTAL to production-ready** | | **~12 developer-weeks** |

### 4. Minimum Viable Product

**Week 1-2 deliverable:**
```
POST   /v1/agents                    → Create agent (any template)
GET    /v1/agents                    → List agents
GET    /v1/agents/:id                → Get agent + status
DELETE /v1/agents/:id                → Delete agent
POST   /v1/agents/:id/actions/start  → Start
POST   /v1/agents/:id/actions/stop   → Stop
GET    /v1/agents/:id/files/*        → Read file
PUT    /v1/agents/:id/files/*        → Write file
POST   /v1/agents/:id/ssh            → Execute command
POST   /v1/auth/api-keys             → Generate API key

Auth: Bearer tvk_<key>
Docs: OpenAPI spec at /docs
```

**That's it.** Same API that already exists, plus API key auth and multi-agent support. A developer could create agents for their users on day 1.

### 5. Key Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **VPS provisioning time (~60s)** | Medium | Acceptable for async workflows; add pre-warmed pool later |
| **Cost per agent (~€4.49/mo minimum)** | High | This is the #1 concern — each agent = a full VPS. May need container mode for smaller agents |
| **SSH as control plane** | Medium | Works but doesn't scale to 1000s of agents well. Plan for agent-side API eventually |
| **Hetzner single-provider dependency** | Medium | Infra abstraction exists; can add AWS/GCP backends |
| **OpenClaw dependency** | Low | OSS, well-maintained, core to the value prop |
| **Cold start for stopped agents** | Medium | VPS boot time is 20-40s. Could keep small agents always-on |

**Biggest risk is unit economics:** At €4.49/VPS/month, the minimum agent cost is high compared to serverless competitors. This is also the **biggest differentiator** — full VM isolation is a feature, not a bug, for security-conscious customers.

---

## PART 5: Recommendation

### Market Verdict: CONDITIONAL ENTER ✅

**Enter if:**
- You can ship MVP in 2 weeks (the code is 70% there)
- You position against frameworks (not platforms) — "deploy agents, not workflows"
- You accept the VPS cost model initially and add cheaper tiers later

**Avoid if:**
- You can't dedicate 2 focused weeks to the spin-out
- You need to compete on price with serverless platforms (Modal, Lambda)
- The Tevy2 consumer product needs all engineering attention

### Positioning Recommendation

**Not "another agent framework." Not "another cloud platform."**

**Position:** "The infrastructure layer for giving your users AI agents."

Tagline options:
- "Deploy AI agents for your users. One API call."
- "Every user gets their own agent. You get one API."
- "Railway for AI Agents — isolated, persistent, programmable."

**Target customer:** Developers building SaaS products who want to embed AI agents for each of their end users. Think:
- Vertical SaaS adding AI capabilities (like Tevy2 itself)
- AI-native startups needing multi-tenant agent infrastructure
- Agencies building custom AI solutions for clients

### What Makes This Different

1. **Full VM isolation per agent** — no noisy neighbors, no data leakage, real security story
2. **Persistent agents with memory** — not ephemeral function execution
3. **Framework agnostic** (OpenClaw-based, but the agent can be anything on the VPS)
4. **Built-in channel integration** — Telegram, WhatsApp, webchat out of the box
5. **File-based agent personality** — SOUL.md / AGENTS.md is more intuitive than JSON config
6. **Already working** — not a pitch deck, it's running in production for Tevy2

### First 3 Moves

**Move 1 (Week 1-2): Ship the API**
- Add API key auth (the middleware change described in the PRD)
- Remove 1-agent limit
- Write OpenAPI docs
- Deploy at `api.tevy2.ai` (dual-purpose domain)
- Create a landing page at `tevy2.ai/platform` or `agentcloud.dev`

**Move 2 (Week 3-4): Get 5 Design Partners**
- Find 5 developers building agent-powered SaaS products
- Offer free infrastructure for 3 months in exchange for feedback
- Post on HackerNews ("Show HN: Railway for AI Agents"), r/SaaS, IndieHackers
- Tweet thread: "We built a platform to deploy AI agents for your users. One API call."

**Move 3 (Month 2): Add Billing + SDKs**
- Usage-based pricing via Stripe
- TypeScript + Python SDKs
- Add a cheaper tier (container-based agents for lighter workloads)
- Developer dashboard with usage analytics

### Pricing Model (Proposed)

| Tier | What | Price |
|------|------|-------|
| **Free** | 1 agent, 24h active, community support | $0 |
| **Developer** | 5 agents, always-on, API access | $19/mo + $5/agent/mo |
| **Scale** | Unlimited agents, webhooks, priority support | $49/mo + $4/agent/mo |
| **Enterprise** | Custom infra, SLA, dedicated support | Custom |

At $5/agent/mo (cost ~€4.49), margins are thin on the agent fee alone. The real margin comes from:
- Platform fee ($19-49/mo base)
- LLM passthrough markup (10-20%)
- Premium features (custom domains, dedicated IPs, priority provisioning)

### What Would Change the Recommendation

**Upgrade to STRONG ENTER if:**
- A well-funded competitor (>$5M raised) launches this exact product in the next 3 months — means market is validated, race is on
- Design partner conversations reveal 3+ teams willing to pay >$100/mo
- LangChain or CrewAI announces agent hosting (confirms the gap exists)

**Downgrade to AVOID if:**
- AWS/Google/Azure ship a "managed agent hosting" product with per-user isolation at scale pricing
- OpenClaw introduces its own multi-tenant hosting offering
- Tevy2 consumer product takes off and needs 100% engineering focus
- Can't find 5 design partners in 30 days (demand is theoretical, not real)

---

## Appendix: Key URLs

**Competitors:**
- LangGraph Platform: https://www.langchain.com/langgraph-platform
- CrewAI: https://crewai.com/pricing
- Relevance AI: https://relevanceai.com
- Modal: https://modal.com
- Railway: https://railway.app
- Fly.io: https://fly.io
- AWS Bedrock Agents: https://aws.amazon.com/bedrock/agents/
- Nebula: https://nebula.gg

**Open Source:**
- Aegra (LangGraph alt): https://github.com/ibbybuilds/aegra (735 ⭐)
- CloudShip Station: https://github.com/cloudshipai/station (391 ⭐)
- Coze Studio: https://github.com/coze-dev/coze-studio (20.4K ⭐)
- FastGPT: https://github.com/labring/FastGPT (27.6K ⭐)
- MCPWorks: https://mcpworks.io

**Market Data:**
- AI agents market: $7.84B (2025) → $10.91B (2026) — MarketsandMarkets
- 60% Fortune 500 using multi-agent orchestration (toolradar.com/guides/best-ai-agent-platforms)
- Fast.io comparison: https://fast.io/resources/best-ai-agent-hosting-platforms/
- Dev.to agent hosting comparison: https://dev.to/nebulagg/top-5-ai-agent-hosting-platforms-for-2026-30hp

**Demand Signals:**
- MCPWorks Reddit post (r/AIStartupAutomation): multi-tenant agent runtime, BSL licensed
- OpenClaw on Azure (r/AIAgentsInAction): persistent agent deployment discussion
- AWS multi-tenant agent guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-multitenant/

---

*Report generated by McClowin Research Agent, 2026-03-30*
