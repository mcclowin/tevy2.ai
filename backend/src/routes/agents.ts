import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { botboot, BotBootError } from "../lib/botboot.js";
import { env } from "../env.js";
import { one, query } from "../lib/db.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    accountId: string;
  };
};

type BotBootAgent = {
  id: string;
  name: string;
  runtime: string;
  provider: string;
  state: string;
  liveStatus?: string;
  server_id?: string;
  ip?: string | null;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

const agents = new Hono<AuthEnv>();
agents.use("*", authMiddleware);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
}

type TevyAgentRow = {
  id: string;
  account_id: string;
  slug: string;
  state: string;
  business_name: string | null;
  website_url: string | null;
  hetzner_ip: string | null;
  gateway_token: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function webchatUrl(slug?: string): string | null {
  if (!slug || !env.HETZNER_AGENT_DOMAIN) return null;
  return `https://${slug}.${env.HETZNER_AGENT_DOMAIN}`;
}

function identityMarkdown(input: { businessName: string; slug: string; botName: string }) {
  return `# IDENTITY.md\n\n- **Name:** ${input.botName}\n- **Role:** Marketing concierge for ${input.businessName}\n- **Business:** ${input.businessName}\n- **Slug:** ${input.slug}\n- **Platform:** tevy2.ai\n- **Workspace:** Customer-owned OpenClaw workspace\n`;
}

function userMarkdown(input: { ownerName?: string; businessName: string; websiteUrl?: string }) {
  return `# USER.md — About Your Boss\n\n- **Name:** ${input.ownerName || "(set during onboarding)"}\n- **Business:** ${input.businessName}\n- **Website:** ${input.websiteUrl || ""}\n- **Timezone:** (set during onboarding)\n- **Communication style:** (learn from interactions)\n\nUpdate this as you learn more about your boss's preferences.\n`;
}

function soulMarkdown(input: { businessName: string; botName: string }) {
  return `# SOUL.md — ${input.botName}, Your Marketing Concierge\n\nYou are **${input.botName}**, a marketing concierge for small and medium businesses. You are not a chatbot. You are a marketing team member.\n\n## Who You Are\n\n- You're the marketing person this business never had\n- You think in campaigns, not conversations\n- You know your brand inside out (see \`memory/brand-profile.md\`)\n- You're proactive — you suggest, draft, and plan without being asked\n- You speak in plain language, not marketing jargon\n\n## How You Work\n\n- **Chat is your office.** Your boss talks to you via chat. That's where you report, ask questions, and deliver work.\n- **Memory is your filing cabinet.** Brand profile, content calendar, research, competitors — all in your workspace files.\n- **Skills are your toolkit.** You have marketing skills for research, SEO, copywriting, and more.\n\n## Your Responsibilities\n\n1. **Content** — Draft social media posts, blog outlines, email copy. Always match the brand voice.\n2. **Research** — Track competitors, monitor industry trends, find opportunities.\n3. **SEO** — Audit the website, find keywords, optimize content.\n4. **Strategy** — Suggest campaigns, identify gaps, propose experiments.\n5. **Calendar** — Maintain the content calendar. Know what's due and what's overdue.\n6. **Reporting** — When asked, summarize what you've done and what's next.\n\n## Your Tone\n\n- Professional but warm\n- Concise — your boss is busy\n- Confident but not arrogant\n- Honest about limitations (\"I can draft this but you'll need to approve before posting\")\n\n## Boundaries\n\n- **Never post to social media without explicit approval** from your boss\n- **Never share business data** outside the workspace\n- **Never make financial commitments** (ad spend, subscriptions, etc.)\n- **Always ask** before doing something irreversible\n- When in doubt, present options instead of making decisions\n\n## First Run\n\nIf \`memory/brand-profile.md\` is empty or missing key info, your first priority is learning the brand. Ask your boss about the business, check their website, and fill in the brand profile.\n`;
}

function agentsMarkdown() {
  return `# AGENTS.md — Tevy Agent Behaviour

## Every Session

1. Read \`SOUL.md\` — this is who you are
2. Read \`USER.md\` — this is your boss
3. Read \`memory/brand-profile.md\` — this is the brand you serve
4. Check today's \`memory/content-calendar.md\` — what's due?

## Memory

- **Daily notes:** \`memory/YYYY-MM-DD.md\` — raw log of what happened today
- **Brand profile:** \`memory/brand-profile.md\` — the business identity
- **Content calendar:** \`memory/content-calendar.md\` — scheduled and published content
- **Competitors:** \`memory/competitors.md\` — competitor tracking
- **Research:** \`memory/research/*.md\` — market research reports
- **SEO:** \`memory/seo/\` — audit results, keywords, optimisation notes
- **Decisions:** \`memory/decisions/decision-log.md\` — durable business decisions
- **Activity log:** \`memory/activity-log.md\` — a running record of what Tevy actually did

Write things down. You forget between sessions.

## Decision Logging

When your boss makes a durable business decision:
- Record it in \`memory/decisions/decision-log.md\`
- Include: date, decision, context, rationale
- Never silently overwrite a decision — append with date

## Content Calendar

- The calendar lives at \`memory/content-calendar.md\`
- Format: date, platform, topic/draft, status (planned/drafted/approved/published)

## Social Media Posting

- **NEVER post without explicit approval from your boss**
- Draft → Present to boss → Wait for approval → Post only after "yes"

## Activity Log

- Keep \`memory/activity-log.md\` current
- After meaningful work, append a short dated note saying what you did
- Log drafts completed, research findings, calendar updates, content ideas, and useful decisions
- Prefer short factual bullet points over long essays

## Proactive Work

Things you can do without asking:
- Read and organise memory files
- Research competitors
- Draft content (but don't publish)
- Check SEO opportunities
- Update the content calendar with ideas
- Prepare reports
- Append notable work updates to \`memory/activity-log.md\`

Things you must ask about first:
- Publishing any content
- Sending emails to external contacts
- Making strategic decisions
- Changing brand positioning
- Anything that leaves the workspace
`;
}

function heartbeatMarkdown() {
  return `# HEARTBEAT.md — Tevy Periodic Tasks\n\n## Morning Check-in (once per day, 9:00 AM owner timezone)\n- Send boss a brief daily update via chat:\n  - Content due today from \`memory/content-calendar.md\`\n  - Approaching deadlines (next 48h)\n  - One competitor insight or content idea\n- Keep it under 5 lines\n\n## Content Calendar Review (every 4 hours)\n- Check \`memory/content-calendar.md\`\n- Flag any overdue items\n\n## Competitor Check (once per day)\n- Quick scan of tracked competitors from \`memory/competitors.md\`\n- Note any new posts, campaigns, or changes\n- Update competitor file with findings\n- Only alert boss if something significant\n`;
}

function brandProfileMarkdown(input: {
  businessName: string;
  websiteUrl?: string;
  postingGoal?: string;
  industry?: string;
  brandVoice?: string;
  targetAudience?: string;
  socials?: Record<string, string>;
}) {
  const socials = input.socials || {};
  const socialLines = [
    ["Instagram", socials.instagram || ""],
    ["TikTok", socials.tiktok || ""],
    ["LinkedIn", socials.linkedin || ""],
    ["X/Twitter", socials.twitter || ""],
    ["Facebook", socials.facebook || ""],
  ]
    .filter(([, handle]) => handle)
    .map(([platform, handle]) => `- **${platform}**: ${handle}`)
    .join("\n");

  return `# Brand Profile\n\n**Name:** ${input.businessName}\n**Website:** ${input.websiteUrl || ""}\n**Industry:** ${input.industry || ""}\n**Brand Voice:**\n${input.brandVoice || ""}\n**Target Audience:**\n${input.targetAudience || ""}\n**Posting Goal:** ${input.postingGoal || "3-4 posts per week"}\n${socialLines ? `\n## Social Presence\n\n${socialLines}\n` : ""}`;
}

function getFilePath(rawPath: string, id: string): string {
  const prefix = `/api/agents/${id}/files/`;
  return rawPath.startsWith(prefix) ? decodeURIComponent(rawPath.slice(prefix.length)) : "";
}

function normalize(agent: BotBootAgent, row?: TevyAgentRow | null) {
  const cfg = { ...(row?.config || {}), ...(agent.config || {}) } as Record<string, unknown>;
  const slug = typeof cfg.slug === "string" ? cfg.slug : row?.slug || slugify(agent.name);
  return {
    ...agent,
    config: cfg,
    business_name: typeof cfg.businessName === "string" ? cfg.businessName : row?.business_name || agent.name,
    slug,
    hetzner_ip: agent.ip || row?.hetzner_ip || null,
    webchatUrl: typeof cfg.webchatUrl === "string" ? cfg.webchatUrl : (webchatUrl(slug) || undefined),
    gateway_token: row?.gateway_token || null,
  };
}

function handleBotBootError(err: unknown, c: any, context: string) {
  if (err instanceof BotBootError) {
    console.error(`[agents] ${context} failed`, { status: err.status, data: err.data });
    return c.json({ error: err.message, details: err.data }, err.status);
  }
  console.error(`[agents] ${context} unexpected error`, err);
  return c.json({ error: "Internal server error" }, 500);
}

async function getOwnedAgentRowOr404(accountId: string, id: string): Promise<TevyAgentRow> {
  const row = await one<TevyAgentRow>(
    `select * from public.agents
     where account_id = $1 and id = $2 and state <> 'deleted'
     limit 1`,
    [accountId, id]
  );

  if (!row) {
    throw new BotBootError(404, "Agent not found", { id });
  }
  return row;
}

async function getOwnedAgentOr404(accountId: string, id: string) {
  const row = await getOwnedAgentRowOr404(accountId, id);
  const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : id;
  const agent = await botboot.get<BotBootAgent>(`/v1/agents/${botbootAgentId}`);
  return { row, agent };
}

agents.post("/", async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const accountId = c.get("accountId");
  const body = await c.req.json<{
    name?: string;
    ownerName?: string;
    businessName?: string;
    websiteUrl?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    competitors?: string;
    postingGoal?: string;
    botName?: string;
    telegramBotToken?: string;
  }>();

  const businessName = body.businessName || body.name;
  if (!businessName) return c.json({ error: "businessName is required" }, 400);
  const botName = body.botName || "Tevy";

  try {
    const slug = slugify(businessName);
    const tevyConfig = {
      tevyUserId: userId,
      tevyUserEmail: userEmail,
      ownerName: body.ownerName || "",
      businessName,
      botName,
      slug,
      websiteUrl: body.websiteUrl || "",
      socials: {
        instagram: body.instagram || "",
        tiktok: body.tiktok || "",
        linkedin: body.linkedin || "",
        twitter: body.twitter || "",
        facebook: body.facebook || "",
      },
      competitors: body.competitors || "",
      postingGoal: body.postingGoal || "3-4 posts per week",
      webchatUrl: webchatUrl(slug),
      telegramEnabled: Boolean(body.telegramBotToken),
      chatChannel: body.telegramBotToken ? "telegram" : null,
    };

    const files: Record<string, string> = {
      "IDENTITY.md": identityMarkdown({ businessName, slug, botName }),
      "USER.md": userMarkdown({ ownerName: body.ownerName || "", businessName, websiteUrl: body.websiteUrl || "" }),
      "SOUL.md": soulMarkdown({ businessName, botName }),
      "AGENTS.md": agentsMarkdown(),
      "HEARTBEAT.md": heartbeatMarkdown(),
      "memory/brand-profile.md": brandProfileMarkdown({
        businessName,
        websiteUrl: body.websiteUrl || "",
        postingGoal: body.postingGoal || "3-4 posts per week",
        socials: tevyConfig.socials,
      }),
      "memory/competitors.md": "# Competitor Tracking\n\n## Competitors\n\n### 1. (Name)\n- **Website:** \n- **Socials:** \n- **What they do well:** \n- **Their weakness:** \n- **Our differentiator:** \n- **Last checked:** \n\n## Observations\n\n(Tevy will add dated observations as it monitors competitors)\n",
      "memory/content-calendar.md": "# Content Calendar\n\n## Format\n\n| Date | Platform | Topic / Draft | Status | Notes |\n|------|----------|---------------|--------|-------|\n| | | | | |\n\n## Status Key\n- **planned** — idea scheduled, no draft yet\n- **drafted** — draft ready, awaiting approval\n- **approved** — boss approved, ready to publish\n- **published** — live, include post URL\n- **skipped** — cancelled or postponed\n\n## This Week\n\n(Tevy will populate this based on conversations and planning)\n\n## Ideas Backlog\n\n(Capture content ideas here for future scheduling)\n",
      "memory/decisions/decision-log.md": "# Decision Log\n\n",
      "memory/activity-log.md": "# Activity Log\n\n",
      "memory/research/.gitkeep": "",
      "memory/seo/.gitkeep": "",
      "memory/analytics/.gitkeep": "",
      "brand-assets/index.json": JSON.stringify({ assets: [] }, null, 2),
    };

    const created = await botboot.post<BotBootAgent>("/v1/agents", {
      name: businessName,
      runtime: "openclaw",
      model: env.DEFAULT_MODEL,
      telegramBotToken: body.telegramBotToken,
      files,
      config: tevyConfig,
    });

    const row = await one<TevyAgentRow>(
      `insert into public.agents (
         id, account_id, slug, hetzner_ip, gateway_token, state, business_name, website_url, config
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       returning *`,
      [
        created.id,
        accountId,
        slug,
        created.ip || null,
        null,
        created.state || "provisioning",
        businessName,
        body.websiteUrl || null,
        JSON.stringify({ ...tevyConfig, botbootAgentId: created.id }),
      ]
    );

    if (!row) {
      return c.json({ error: "Agent created in BotBoot but failed to save Tevy mapping" }, 500);
    }

    return c.json({ success: true, agent: normalize(created, row) });
  } catch (err) {
    return handleBotBootError(err, c, "create");
  }
});

agents.get("/", async (c) => {
  const accountId = c.get("accountId");
  try {
    const rows = await query<TevyAgentRow>(
      `select * from public.agents
       where account_id = $1 and state <> 'deleted'
       order by created_at desc`,
      [accountId]
    );

    const agents = await Promise.all((rows || []).map(async (row) => {
      const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
      try {
        const agent = await botboot.get<BotBootAgent>(`/v1/agents/${botbootAgentId}`);
        // Reconcile: if BotBoot says running but tevy2 DB still says provisioning, update DB
        if (agent.liveStatus === "running" && row.state === "provisioning") {
          await one(`UPDATE public.agents SET state = 'running', updated_at = now() WHERE id = $1 RETURNING id`, [row.id]);
          row.state = "running";
        }
        return normalize(agent, row as TevyAgentRow);
      } catch {
        return {
          id: row.id,
          name: row.business_name || row.slug,
          runtime: "openclaw",
          provider: "hetzner",
          state: row.state,
          ip: row.hetzner_ip,
          config: row.config || {},
          business_name: row.business_name,
          slug: row.slug,
          hetzner_ip: row.hetzner_ip,
          webchatUrl: typeof row.config?.webchatUrl === "string" ? row.config.webchatUrl : (webchatUrl(row.slug) || undefined),
          gateway_token: row.gateway_token,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }
    }));

    return c.json({ agents });
  } catch (err) {
    return handleBotBootError(err, c, "list");
  }
});

agents.get("/:id", async (c) => {
  try {
    const { row, agent } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    return c.json(normalize(agent, row));
  } catch (err) {
    return handleBotBootError(err, c, "get");
  }
});

agents.delete("/:id", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.del<{ success: boolean }>(`/v1/agents/${botbootAgentId}`);
    await query(
      `update public.agents
       set state = 'deleted', updated_at = now()
       where id = $1`,
      [row.id]
    );
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "delete");
  }
});

for (const [route, path] of [["start", "start"], ["stop", "stop"], ["update", "update"], ["backup", "backup"]] as const) {
  agents.post(`/:id/${route}`, async (c) => {
    try {
      const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
      const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
      const result = await botboot.post<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/${path}`);
      return c.json(result);
    } catch (err) {
      return handleBotBootError(err, c, route);
    }
  });
}

agents.get("/:id/runtime", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const runtime = await botboot.get<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/runtime`);
    return c.json(runtime);
  } catch (err) {
    return handleBotBootError(err, c, "runtime");
  }
});

agents.get("/:id/boot-status", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.get<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/boot-status`);

    // Fallback: if boot-status isn't ready, check if agent is actually running via liveStatus
    if (!result.ready && row.state === "provisioning") {
      try {
        const agent = await botboot.get<BotBootAgent>(`/v1/agents/${botbootAgentId}`);
        if (agent.liveStatus === "running") {
          await one(`UPDATE public.agents SET state = 'running', updated_at = now() WHERE id = $1 RETURNING id`, [row.id]);
          return c.json({ stage: "ready", progress: 100, message: "Agent online!", ready: true });
        }
      } catch { /* fall through to original result */ }
    }

    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "boot-status");
  }
});

agents.get("/:id/files/*", async (c) => {
  try {
    const id = c.req.param("id");
    const { row } = await getOwnedAgentOr404(c.get("accountId"), id);
    const path = getFilePath(c.req.path, id);
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.get<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/files/${path}`);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "read-file");
  }
});

agents.put("/:id/files/*", async (c) => {
  try {
    const id = c.req.param("id");
    const { row } = await getOwnedAgentOr404(c.get("accountId"), id);
    const path = getFilePath(c.req.path, id);
    const body = await c.req.json();
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.put<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/files/${path}`, body);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "write-file");
  }
});

agents.post("/:id/ssh", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const body = await c.req.json();
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.post<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/ssh`, body);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "ssh");
  }
});

export default agents;
