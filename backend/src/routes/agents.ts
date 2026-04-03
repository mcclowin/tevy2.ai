import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { botboot, BotBootError } from "../lib/botboot.js";
import { env } from "../env.js";

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

function ownedByUser(agent: BotBootAgent, userId: string): boolean {
  const cfg = agent.config || {};
  return cfg.tevyUserId === userId;
}

function webchatUrl(slug?: string): string | null {
  if (!slug || !env.HETZNER_AGENT_DOMAIN) return null;
  return `https://${slug}.${env.HETZNER_AGENT_DOMAIN}`;
}

function normalize(agent: BotBootAgent) {
  const cfg = agent.config || {};
  const slug = typeof cfg.slug === "string" ? cfg.slug : slugify(agent.name);
  return {
    ...agent,
    business_name: typeof cfg.businessName === "string" ? cfg.businessName : agent.name,
    slug,
    hetzner_ip: agent.ip || null,
    webchatUrl: typeof cfg.webchatUrl === "string" ? cfg.webchatUrl : (webchatUrl(slug) || undefined),
    gateway_token: typeof cfg.gatewayToken === "string" ? cfg.gatewayToken : null,
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

async function getOwnedAgentOr404(userId: string, id: string) {
  const agent = await botboot.get<BotBootAgent>(`/v1/agents/${id}`);
  if (!ownedByUser(agent, userId)) {
    throw new BotBootError(404, "Agent not found", { id });
  }
  return agent;
}

agents.post("/", async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
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
    telegramBotToken?: string;
  }>();

  const businessName = body.businessName || body.name;
  if (!businessName) return c.json({ error: "businessName is required" }, 400);

  try {
    const slug = slugify(businessName);
    const files: Record<string, string> = {
      "IDENTITY.md": `# IDENTITY.md\n\n- Name: ${businessName} Marketing Bot\n- Slug: ${slug}\n`,
      "USER.md": `# USER.md\n\n- Business: ${businessName}\n- Owner: ${body.ownerName || ""}\n- Website: ${body.websiteUrl || ""}\n`,
      "SOUL.md": `# SOUL.md\n\nYou are the marketing operations assistant for ${businessName}. Keep outputs concise, practical, and brand-aligned.\n`,
    };

    const created = await botboot.post<BotBootAgent>("/v1/agents", {
      name: businessName,
      runtime: "openclaw",
      model: env.DEFAULT_MODEL,
      files,
      config: {
        tevyUserId: userId,
        tevyUserEmail: userEmail,
        ownerName: body.ownerName || "",
        businessName,
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
      },
    });

    return c.json({ success: true, agent: normalize(created) });
  } catch (err) {
    return handleBotBootError(err, c, "create");
  }
});

agents.get("/", async (c) => {
  const userId = c.get("userId");
  try {
    const data = await botboot.get<{ agents: BotBootAgent[] }>("/v1/agents");
    const agents = (data.agents || []).filter((a) => ownedByUser(a, userId)).map(normalize);
    return c.json({ agents });
  } catch (err) {
    return handleBotBootError(err, c, "list");
  }
});

agents.get("/:id", async (c) => {
  try {
    const agent = await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    return c.json(normalize(agent));
  } catch (err) {
    return handleBotBootError(err, c, "get");
  }
});

agents.delete("/:id", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const result = await botboot.del<{ success: boolean }>(`/v1/agents/${c.req.param("id")}`);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "delete");
  }
});

for (const [route, path] of [["start", "start"], ["stop", "stop"], ["update", "update"], ["backup", "backup"]] as const) {
  agents.post(`/:id/${route}`, async (c) => {
    try {
      await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
      const result = await botboot.post<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/${path}`);
      return c.json(result);
    } catch (err) {
      return handleBotBootError(err, c, route);
    }
  });
}

agents.get("/:id/runtime", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const runtime = await botboot.get<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/runtime`);
    return c.json(runtime);
  } catch (err) {
    return handleBotBootError(err, c, "runtime");
  }
});

agents.get("/:id/boot-status", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const result = await botboot.get<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/boot-status`);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "boot-status");
  }
});

agents.get("/:id/files/*", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const path = c.req.param("*");
    const result = await botboot.get<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/files/${path}`);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "read-file");
  }
});

agents.put("/:id/files/*", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const path = c.req.param("*");
    const body = await c.req.json();
    const result = await botboot.put<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/files/${path}`, body);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "write-file");
  }
});

agents.post("/:id/ssh", async (c) => {
  try {
    await getOwnedAgentOr404(c.get("userId"), c.req.param("id"));
    const body = await c.req.json();
    const result = await botboot.post<Record<string, unknown>>(`/v1/agents/${c.req.param("id")}/ssh`, body);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "ssh");
  }
});

export default agents;
