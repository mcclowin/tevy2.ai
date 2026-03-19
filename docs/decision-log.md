# tevy2.ai — Decision Log

Last updated: 2026-03-19 01:08 UTC

## Purpose

Track product and architecture forks as we make them, especially where privacy, security, speed of delivery, and user experience pull in different directions.

## 2026-03-19 — Webchat Transport Options

### Context

We want the Tevy dashboard to offer embedded webchat for each deployed agent.

The PRD says:

- Reuse OpenClaw's existing Control UI and webchat instead of building our own chat protocol/UI.
- Keep the Tevy backend thin.
- Keep customer state on the VPS.

The current implementation can provision and run agents, but generated `webchatUrl` hostnames are not yet backed by real DNS/load-balancer routing. That means the frontend can generate `https://<slug>.agents.tevy2.ai`, but the browser cannot reach it yet.

### Option A — Direct Browser -> Agent Gateway

Shape:

`browser -> https://<agent-domain> -> OpenClaw Control UI + Gateway on that VPS`

Pros:

- Fastest path to working chat if the network path is made real.
- Closest to official OpenClaw architecture.
- Tevy backend stays out of the chat transport path.
- Better privacy posture by default because Tevy does not relay chat content.

Cons:

- Every agent gateway becomes part of the public edge surface.
- Requires real wildcard DNS and routing to each VPS.
- Requires HTTPS and browser-safe access for each agent endpoint.
- Harder to add centralized auth, rate limits, abuse controls, and audit controls later.

Privacy:

- Best of the three options for minimizing Tevy visibility into chat content.
- Tevy can still know which agent belongs to which user, but chat payloads do not need to pass through Tevy.

### Option B — Browser -> Reverse Proxy -> Agent Gateway

Shape:

`browser -> tevy-controlled HTTPS proxy -> agent gateway`

Pros:

- Safer default posture for a customer product.
- Central place for TLS, auth, access control, rate limiting, logging, and abuse protection.
- Easier to hide agent IPs and tighten direct exposure.
- Better long-term fit for a multi-customer SaaS.
- Can still reuse OpenClaw's Control UI and gateway rather than building our own chat app.

Cons:

- More infrastructure work than direct access.
- Proxy can technically inspect chat traffic.
- Privacy policy and logging rules must be explicit and intentional.

Privacy:

- Tevy gains the technical ability to observe traffic if we choose to log or inspect it.
- This does not force surveillance, but it makes it possible.
- If we choose this route, we should explicitly commit to:
  - no content logging by default
  - minimal metadata retention
  - support-mode access only when explicitly enabled

### Option C — Browser -> Tevy Backend/API -> Agent Gateway

Shape:

`browser -> tevy app/backend -> custom proxy/session layer -> gateway`

Pros:

- Maximum central control.
- Cleanest central tenancy enforcement.
- Easy to add product-level permissions and analytics.

Cons:

- Furthest from OpenClaw's native design.
- Most engineering work.
- Highest risk of accidentally rebuilding a second chat platform.
- Highest privacy sensitivity because Tevy becomes a first-class chat relay.

Privacy:

- Weakest default privacy posture.
- Tevy is directly in the message path by design.

### Comparison

| Option | Speed to first working chat | Operational safety | User privacy by default | Product control |
|---|---|---|---|---|
| A. Direct gateway | Fastest | Medium | Strongest | Lowest |
| B. Reverse proxy | Medium | Strongest | Medium | High |
| C. Backend relay | Slowest | Medium | Weakest | Highest |

### Current Recommendation

Two-stage approach:

1. Short term: get chat working with direct gateway access.
2. Long term: move to a reverse-proxy architecture once the public routing layer exists and we want stronger product control.

Reason:

- It gets us to working webchat quickly.
- It still reuses official OpenClaw UI rather than building our own chat implementation.
- It keeps the privacy posture cleaner while the product is still early.

### Fastest Thing To Implement Right Now

For local/dev:

- Use direct access to the agent gateway via `http://<hetzner_ip>:18789`.
- Embed or link to that from the dashboard when running locally over HTTP.

For proper public product behavior:

- Implement the missing network layer for `https://<slug>.agents.tevy2.ai`.
- Minimum viable version:
  - wildcard DNS for `*.agents.tevy2.ai`
  - routing from that host to the agent gateway
  - HTTPS termination

This is the fastest path because it works with the current decision to reuse OpenClaw's Control UI.

### Why Chat Is Not Working Yet

Not because the frontend embed idea is wrong.

The immediate problem is infrastructure:

- backend generates `webchatUrl`
- frontend uses it correctly
- but the generated hostname is not actually live yet
- DNS currently returns `NXDOMAIN` for agent hostnames

### Follow-up Work

- Add a local/dev fallback from agent domain to direct IP `http://<hetzner_ip>:18789`.
- Implement real DNS/routing for `*.agents.tevy2.ai`.
- Once public routing exists, decide whether to stay direct or front it with a reverse proxy.
- If we choose reverse proxy, write down explicit privacy rules before rollout.

## 2026-03-19 — Runtime and Update Visibility

### Decision

Expose per-agent runtime/update status in Settings.

### Reason

Users and operators need to know:

- whether the gateway is healthy
- which OpenClaw version is running
- which image repo revision is deployed
- whether `update.sh` exists and can be executed

### Result

Settings now surfaces:

- OpenClaw version
- image revision
- gateway status
- update-script presence
- per-agent `Update image` action
