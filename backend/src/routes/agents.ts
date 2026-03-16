/**
 * Agent routes — Hetzner VPS model
 *
 * POST   /api/agents           → Create agent (provision VPS)
 * GET    /api/agents           → List user's agents
 * GET    /api/agents/:id       → Get agent details + live status
 * DELETE /api/agents/:id       → Backup + delete agent VPS
 * POST   /api/agents/:id/start → Power on
 * POST   /api/agents/:id/stop  → Shutdown
 * POST   /api/agents/:id/backup → Create backup
 * GET    /api/agents/:id/files/* → Read workspace file via SSH
 * PUT    /api/agents/:id/files/* → Write workspace file via SSH
 * POST   /api/agents/:id/ssh   → Execute command via SSH
 * GET    /api/agents/:id/boot-status → Poll boot progress
 */

import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../env.js";
import * as hetznerInfra from "../lib/hetzner-infra.js";
import * as ssh from "../lib/ssh.js";
import type { CustomerConfig } from "../lib/cloud-init.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    accountId: string;
  };
};

const agents = new Hono<AuthEnv>();
agents.use("*", authMiddleware);

// ── Helpers ────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function webchatUrl(slug: string): string {
  return `https://${slug}.${env.HETZNER_AGENT_DOMAIN}`;
}

// ── POST /api/agents — provision a new agent VPS ───────────────────────

agents.post("/", async (c) => {
  const accountId = c.get("accountId");
  const userEmail = c.get("userEmail");

  const body = await c.req.json<{
    ownerName: string;
    businessName: string;
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

  if (!body.businessName) {
    return c.json({ error: "businessName is required" }, 400);
  }

  // Check for existing agent (MVP: 1 per account)
  const { data: existing } = await supabase
    .from("agents")
    .select("id")
    .eq("account_id", accountId)
    .neq("state", "deleted")
    .limit(1);

  if (existing && existing.length > 0) {
    return c.json({ error: "You already have an active agent. Delete it first." }, 409);
  }

  const slug = slugify(body.businessName);
  const serverName = `tevy-${slug}-${Date.now().toString(36)}`;
  const gatewayToken = crypto.randomUUID().replace(/-/g, "");

  // Build customer config for cloud-init
  const customerConfig: CustomerConfig = {
    slug,
    businessName: body.businessName,
    ownerName: body.ownerName || "",
    websiteUrl: body.websiteUrl,
    gatewayToken,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    defaultModel: env.DEFAULT_MODEL,
    telegramBotToken: body.telegramBotToken,
    tavilyApiKey: env.TAVILY_API_KEY || undefined,
    socials: {
      instagram: body.instagram,
      tiktok: body.tiktok,
      linkedin: body.linkedin,
      twitter: body.twitter,
      facebook: body.facebook,
    },
    competitors: body.competitors,
    postingGoal: body.postingGoal,
    tevy2BackendUrl: env.BACKEND_PUBLIC_URL,
    tevy2DashboardUrl: env.FRONTEND_URL,
  };

  try {
    // Create VPS
    const machine = await hetznerInfra.createMachine({
      name: serverName,
      envVars: {},
      customerConfig,
    });

    // Store in DB
    const { data: agent, error: dbError } = await supabase
      .from("agents")
      .insert({
        account_id: accountId,
        slug,
        hetzner_server_id: machine.id,
        hetzner_ip: machine.ip,
        gateway_token: gatewayToken,
        state: "provisioning",
        business_name: body.businessName,
        website_url: body.websiteUrl || null,
        config: {
          ownerName: body.ownerName,
          socials: customerConfig.socials,
          competitors: body.competitors,
          postingGoal: body.postingGoal,
          telegramBotToken: body.telegramBotToken,
        },
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return c.json({
      success: true,
      agent: {
        id: agent.id,
        slug,
        state: "provisioning",
        ip: machine.ip,
        webchatUrl: webchatUrl(slug),
        hetznerServerId: machine.id,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Provisioning failed";
    console.error("Agent creation failed:", msg);
    return c.json({ error: "Failed to provision agent", details: msg }, 500);
  }
});

// ── GET /api/agents — list user's agents ───────────────────────────────

agents.get("/", async (c) => {
  const accountId = c.get("accountId");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("account_id", accountId)
    .neq("state", "deleted")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  // Enrich with live status
  const enriched = await Promise.all(
    (data || []).map(async (agent) => {
      try {
        if (!agent.hetzner_server_id) return { ...agent, liveStatus: "unknown" };
        const machine = await hetznerInfra.getMachine(agent.hetzner_server_id);
        return {
          ...agent,
          liveStatus: machine.state,
          webchatUrl: webchatUrl(agent.slug),
        };
      } catch {
        return { ...agent, liveStatus: "unknown" };
      }
    })
  );

  return c.json({ agents: enriched });
});

// ── GET /api/agents/:id — get single agent ─────────────────────────────

agents.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data) return c.json({ error: "Agent not found" }, 404);

  try {
    const machine = await hetznerInfra.getMachine(data.hetzner_server_id);
    return c.json({
      ...data,
      liveStatus: machine.state,
      webchatUrl: webchatUrl(data.slug),
    });
  } catch {
    return c.json({ ...data, liveStatus: "unknown" });
  }
});

// ── POST /api/agents/:id/start ─────────────────────────────────────────

agents.post("/:id/start", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data) return c.json({ error: "Agent not found" }, 404);

  try {
    await hetznerInfra.startMachine(data.hetzner_server_id);
    await supabase
      .from("agents")
      .update({ state: "running", updated_at: new Date().toISOString() })
      .eq("id", agentId);

    return c.json({ success: true, state: "running" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Start failed";
    return c.json({ error: msg }, 500);
  }
});

// ── POST /api/agents/:id/stop ──────────────────────────────────────────

agents.post("/:id/stop", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data) return c.json({ error: "Agent not found" }, 404);

  try {
    await hetznerInfra.stopMachine(data.hetzner_server_id);
    await supabase
      .from("agents")
      .update({ state: "stopped", updated_at: new Date().toISOString() })
      .eq("id", agentId);

    return c.json({ success: true, state: "stopped" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stop failed";
    return c.json({ error: msg }, 500);
  }
});

// ── DELETE /api/agents/:id ─────────────────────────────────────────────

agents.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data) return c.json({ error: "Agent not found" }, 404);

  // Backup before delete
  if (data.hetzner_ip) {
    try {
      await ssh.backup(data.hetzner_ip);
    } catch {
      console.warn("Backup before delete failed — proceeding anyway");
    }
  }

  // Delete VPS
  try {
    await hetznerInfra.deleteMachine(data.hetzner_server_id);
  } catch {
    // Server might already be gone
  }

  await supabase
    .from("agents")
    .update({ state: "deleted", updated_at: new Date().toISOString() })
    .eq("id", agentId);

  return c.json({ success: true });
});

// ── POST /api/agents/:id/backup ────────────────────────────────────────

agents.post("/:id/backup", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("hetzner_ip")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data?.hetzner_ip) return c.json({ error: "Agent not found" }, 404);

  try {
    const backupPath = await ssh.backup(data.hetzner_ip);
    return c.json({ success: true, path: backupPath });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Backup failed";
    return c.json({ error: msg }, 500);
  }
});

// ── GET /api/agents/:id/files/* — read workspace file via SSH ──────────

agents.get("/:id/files/*", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");
  const filePath = c.req.path.split("/files/")[1];

  if (!filePath) return c.json({ error: "File path required" }, 400);
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return c.json({ error: "Invalid path" }, 400);
  }

  const { data, error } = await supabase
    .from("agents")
    .select("hetzner_ip")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data?.hetzner_ip) return c.json({ error: "Agent not found" }, 404);

  try {
    const content = await ssh.readFile(data.hetzner_ip, filePath);
    return c.json({ path: filePath, content });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Read failed";
    return c.json({ error: msg }, 404);
  }
});

// ── PUT /api/agents/:id/files/* — write workspace file via SSH ─────────

agents.put("/:id/files/*", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");
  const filePath = c.req.path.split("/files/")[1];

  if (!filePath) return c.json({ error: "File path required" }, 400);
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return c.json({ error: "Invalid path" }, 400);
  }

  const { content } = await c.req.json<{ content: string }>();
  if (content === undefined) return c.json({ error: "content required" }, 400);

  const { data, error } = await supabase
    .from("agents")
    .select("hetzner_ip")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data?.hetzner_ip) return c.json({ error: "Agent not found" }, 404);

  try {
    await ssh.writeFile(data.hetzner_ip, filePath, content);
    return c.json({ success: true, path: filePath });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Write failed";
    return c.json({ error: msg }, 500);
  }
});

// ── POST /api/agents/:id/ssh — execute command via SSH ─────────────────

agents.post("/:id/ssh", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { command } = await c.req.json<{ command: string }>();
  if (!command) return c.json({ error: "command required" }, 400);

  // Block dangerous commands
  const blocked = ["rm -rf /", "mkfs", "dd if=", "> /dev/sd"];
  if (blocked.some((b) => command.includes(b))) {
    return c.json({ error: "Command blocked" }, 403);
  }

  const { data, error } = await supabase
    .from("agents")
    .select("hetzner_ip")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data?.hetzner_ip) return c.json({ error: "Agent not found" }, 404);

  try {
    const result = await ssh.exec(data.hetzner_ip, command);
    return c.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "SSH failed";
    return c.json({ error: msg }, 500);
  }
});

// ── GET /api/agents/:id/boot-status — poll provisioning progress ───────

agents.get("/:id/boot-status", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single();

  if (error || !data) return c.json({ error: "Agent not found" }, 404);

  if (!data.hetzner_server_id) {
    return c.json({ stage: "error", progress: 0, message: "No server ID", ready: false });
  }

  try {
    const machine = await hetznerInfra.getMachine(data.hetzner_server_id);

    // Server not running yet
    if (machine.state === "initializing" || machine.state === "starting") {
      return c.json({ stage: "provisioning", progress: 20, message: "Server starting...", ready: false });
    }
    if (machine.state === "off" || machine.state === "stopping") {
      return c.json({ stage: "offline", progress: 0, message: `Server is ${machine.state}`, ready: false });
    }

    // Server is running — check if SSH is up and gateway is active
    const ip = data.hetzner_ip || machine.ip;

    // Try SSH ping
    const reachable = await ssh.ping(ip);
    if (!reachable) {
      return c.json({ stage: "booting", progress: 40, message: "Server running, waiting for SSH...", ready: false });
    }

    // Check provision log
    const provisionResult = await ssh.exec(ip, "tail -5 /var/log/tevy-provision.log 2>/dev/null || echo 'no log'", { user: "root" });
    if (provisionResult.stdout.includes("Provisioning complete")) {
      // Provision done — check gateway
      const gwStatus = await ssh.gatewayStatus(ip);

      if (gwStatus === "active") {
        // Update DB state if still provisioning
        if (data.state === "provisioning") {
          await supabase
            .from("agents")
            .update({ state: "running", hetzner_ip: ip, updated_at: new Date().toISOString() })
            .eq("id", agentId);
        }

        return c.json({
          stage: "ready",
          progress: 100,
          message: "Agent online!",
          ready: true,
          webchatUrl: webchatUrl(data.slug),
        });
      }

      return c.json({ stage: "gateway", progress: 80, message: "Gateway starting...", ready: false });
    }

    return c.json({ stage: "provisioning", progress: 60, message: "Installing agent...", ready: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Status check failed";
    return c.json({ stage: "error", progress: 0, message: msg, ready: false });
  }
});

export default agents;
