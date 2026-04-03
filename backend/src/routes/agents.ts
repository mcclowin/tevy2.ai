import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { botboot, BotBootError } from "../lib/botboot.js";
import { env } from "../env.js";
import { supabase } from "../lib/supabase.js";

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
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("account_id", accountId)
    .eq("id", id)
    .neq("state", "deleted")
    .single();

  if (error || !data) {
    throw new BotBootError(404, "Agent not found", { id });
  }
  return data as TevyAgentRow;
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

    const tevyConfig = {
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
    };

    const created = await botboot.post<BotBootAgent>("/v1/agents", {
      name: businessName,
      runtime: "openclaw",
      model: env.DEFAULT_MODEL,
      telegramBotToken: body.telegramBotToken,
      files,
      config: tevyConfig,
    });

    const { data: row, error: rowError } = await supabase
      .from("agents")
      .insert({
        id: created.id,
        account_id: accountId,
        slug,
        hetzner_ip: created.ip || null,
        gateway_token: null,
        state: created.state || "provisioning",
        business_name: businessName,
        website_url: body.websiteUrl || null,
        config: { ...tevyConfig, botbootAgentId: created.id },
      })
      .select("*")
      .single();

    if (rowError) {
      console.error("[agents] failed to persist Tevy mapping row", rowError);
      return c.json({ error: "Agent created in BotBoot but failed to save Tevy mapping", details: rowError.message }, 500);
    }

    return c.json({ success: true, agent: normalize(created, row as TevyAgentRow) });
  } catch (err) {
    return handleBotBootError(err, c, "create");
  }
});

agents.get("/", async (c) => {
  const accountId = c.get("accountId");
  try {
    const { data: rows, error } = await supabase
      .from("agents")
      .select("*")
      .eq("account_id", accountId)
      .neq("state", "deleted")
      .order("created_at", { ascending: false });

    if (error) return c.json({ error: error.message }, 500);

    const agents = await Promise.all((rows || []).map(async (row) => {
      const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
      try {
        const agent = await botboot.get<BotBootAgent>(`/v1/agents/${botbootAgentId}`);
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
    await supabase.from("agents").update({ state: "deleted", updated_at: new Date().toISOString() }).eq("id", row.id);
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
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "boot-status");
  }
});

agents.get("/:id/files/*", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const path = c.req.param("*");
    const botbootAgentId = typeof row.config?.botbootAgentId === "string" ? row.config.botbootAgentId : row.id;
    const result = await botboot.get<Record<string, unknown>>(`/v1/agents/${botbootAgentId}/files/${path}`);
    return c.json(result);
  } catch (err) {
    return handleBotBootError(err, c, "read-file");
  }
});

agents.put("/:id/files/*", async (c) => {
  try {
    const { row } = await getOwnedAgentOr404(c.get("accountId"), c.req.param("id"));
    const path = c.req.param("*");
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
