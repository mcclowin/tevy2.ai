/**
 * Channel management routes — WhatsApp setup/status/disconnect
 *
 * POST   /api/agents/:id/channels/whatsapp/setup      → Patch config + start QR login
 * GET    /api/agents/:id/channels/whatsapp/status      → Check if WhatsApp is linked
 * GET    /api/agents/:id/channels/whatsapp/qr          → Get current QR code (if login in progress)
 * POST   /api/agents/:id/channels/whatsapp/disconnect  → Remove WhatsApp config + restart
 */

import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import * as ssh from "../lib/ssh.js";
import * as hetznerInfra from "../lib/hetzner-infra.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    accountId: string;
  };
};

const channels = new Hono<AuthEnv>();
channels.use("*", authMiddleware);

// ── Helpers ────────────────────────────────────────────────────────────

type AgentRow = {
  id: string;
  slug: string;
  hetzner_ip: string | null;
  hetzner_server_id: string;
  config: Record<string, unknown>;
};

async function getAgentForAccount(accountId: string, agentId: string): Promise<AgentRow | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("id, slug, hetzner_ip, hetzner_server_id, config")
    .eq("id", agentId)
    .eq("account_id", accountId)
    .single<AgentRow>();

  if (error || !data) return null;
  return data;
}

async function resolveIp(agent: AgentRow): Promise<string> {
  if (agent.hetzner_ip) return agent.hetzner_ip;
  const machine = await hetznerInfra.getMachine(agent.hetzner_server_id);
  if (machine.ip) {
    await supabase
      .from("agents")
      .update({ hetzner_ip: machine.ip, updated_at: new Date().toISOString() })
      .eq("id", agent.id);
  }
  return machine.ip;
}

/**
 * Read openclaw.json from the VPS, parse as JSON.
 */
async function readOpenClawConfig(ip: string): Promise<Record<string, unknown>> {
  const result = await ssh.exec(ip, "cat /home/agent/.openclaw/openclaw.json");
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read openclaw.json: ${result.stderr}`);
  }
  // openclaw.json is JSON5 — use a lenient parse approach
  // Strip comments and trailing commas for safe JSON.parse
  const cleaned = result.stdout
    .replace(/\/\/.*$/gm, "")           // line comments
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
    .replace(/,\s*([}\]])/g, "$1")      // trailing commas
    .replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":'); // unquoted keys
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: use jq on the VPS to handle JSON5
    const jqResult = await ssh.exec(ip, "node -e \"const fs=require('fs'); const j=require('/usr/lib/node_modules/openclaw/node_modules/json5/lib/index.js'); console.log(JSON.stringify(j.parse(fs.readFileSync('/home/agent/.openclaw/openclaw.json','utf8'))))\"");
    if (jqResult.exitCode !== 0) {
      throw new Error(`Failed to parse openclaw.json: ${jqResult.stderr}`);
    }
    return JSON.parse(jqResult.stdout.trim());
  }
}

/**
 * Write openclaw.json to the VPS (as standard JSON).
 */
async function writeOpenClawConfig(ip: string, config: Record<string, unknown>): Promise<void> {
  const json = JSON.stringify(config, null, 2);
  const b64 = Buffer.from(json).toString("base64");
  const result = await ssh.exec(ip, `echo '${b64}' | base64 -d > /home/agent/.openclaw/openclaw.json && chmod 600 /home/agent/.openclaw/openclaw.json`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to write openclaw.json: ${result.stderr}`);
  }
}

async function hasWhatsAppCreds(ip: string): Promise<boolean> {
  const credsResult = await ssh.exec(ip, "ls -la /home/agent/.openclaw/credentials/whatsapp/*/creds.json 2>/dev/null || echo 'no creds'");
  return !credsResult.stdout.includes("no creds");
}

// ── POST /agents/:id/channels/whatsapp/setup ───────────────────────────
// Patches openclaw.json with WhatsApp config, restarts gateway, starts login.
// The QR code is captured from the login process and stored in a temp file.

channels.post("/:id/channels/whatsapp/setup", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const body = await c.req.json<{
    phoneNumber?: string;   // Owner's phone (for allowFrom)
    dmPolicy?: string;      // "allowlist" | "open" | "pairing"
  }>();

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);

    // Check SSH reachability
    const reachable = await ssh.ping(ip);
    if (!reachable) {
      return c.json({ error: "Agent VPS is not reachable" }, 503);
    }

    // Read current config
    const config = await readOpenClawConfig(ip);

    // Add WhatsApp channel config
    const channels_config = (config.channels || {}) as Record<string, unknown>;
    const dmPolicy = body.dmPolicy || "allowlist";
    const allowFrom = body.phoneNumber ? [body.phoneNumber] : ["*"];

    channels_config.whatsapp = {
      enabled: true,
      dmPolicy,
      allowFrom,
      groupPolicy: "allowlist",
      groupAllowFrom: allowFrom,
      sendReadReceipts: true,
    };
    config.channels = channels_config;

    // Ensure whatsapp plugin is enabled
    const plugins = (config.plugins || { entries: {} }) as { entries: Record<string, { enabled: boolean }> };
    plugins.entries = plugins.entries || {};
    plugins.entries.whatsapp = { enabled: true };
    config.plugins = plugins;

    // Write updated config
    await writeOpenClawConfig(ip, config);

    // Match the official OpenClaw flow: link WhatsApp first, then start the
    // gateway afterwards. Stop the gateway up front so the login command owns
    // the WhatsApp session while generating the QR and waiting for the scan.
    await ssh.exec(ip, "sudo -n /bin/systemctl stop openclaw-gateway || true", { user: "agent" });

    // Start WhatsApp login in the background and capture QR output to disk.
    // The earlier tee-based approach kept stdout attached to the SSH session,
    // which caused the setup request to time out before the QR flow started.
    const loginResult = await ssh.exec(
      ip,
      `sh -lc 'rm -f /tmp/wa-login-output.txt && nohup sh -lc '"'"'cd /home/agent && timeout 120 openclaw channels login --channel whatsapp > /tmp/wa-login-output.txt 2>&1'"'"' >/dev/null 2>&1 < /dev/null & echo login_started'`,
      { timeoutMs: 15_000 }
    );

    if (!loginResult.stdout.includes("login_started")) {
      throw new Error(`Failed to launch WhatsApp login: ${loginResult.stderr || loginResult.stdout}`);
    }

    // Update agent config in DB
    const agentConfig = (agent.config || {}) as Record<string, unknown>;
    agentConfig.whatsappEnabled = true;
    agentConfig.whatsappPhone = body.phoneNumber || null;

    await supabase
      .from("agents")
      .update({
        config: agentConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    return c.json({
      success: true,
      message: "WhatsApp setup initiated. Poll /qr for QR code and /status for link status.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "WhatsApp setup failed";
    console.error("WhatsApp setup error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// ── GET /agents/:id/channels/whatsapp/qr ───────────────────────────────
// Returns the QR code data from the login process.
// The QR is captured as text from openclaw channels login output.

channels.get("/:id/channels/whatsapp/qr", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);

    // QR polling must stay fast. Avoid `openclaw channels status` here because
    // it blocks for a long time when the gateway is unavailable.
    if (await hasWhatsAppCreds(ip)) {
      // Official flow: once linked, start the gateway so it owns the socket and
      // handles reconnects. Only do this after credentials exist.
      const gatewayState = await ssh.gatewayStatus(ip);
      if (gatewayState !== "active") {
        try {
          await ssh.restartGateway(ip);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Gateway restart failed";
          return c.json({
            linked: true,
            qr: null,
            message: `WhatsApp linked, but gateway restart failed: ${msg}`,
          });
        }
      }
      return c.json({ linked: true, qr: null });
    }

    // Read the login output file for QR data
    const qrResult = await ssh.exec(ip, "cat /tmp/wa-login-output.txt 2>/dev/null || echo ''");
    const output = qrResult.stdout;

    if (!output || output.trim() === "") {
      return c.json({ linked: false, qr: null, message: "Waiting for QR code..." });
    }

    // Extract QR data — openclaw outputs QR as text blocks
    // We look for the raw pairing data or the QR text representation
    // The QR is typically a block of unicode characters (█ and spaces)
    const lines = output.split("\n");
    const qrLines: string[] = [];
    let inQr = false;

    for (const line of lines) {
      // QR codes use block characters (█, ▀, ▄, etc.)
      if (line.includes("█") || line.includes("▀") || line.includes("▄") || line.includes("▐") || line.includes("▌")) {
        inQr = true;
        qrLines.push(line);
      } else if (inQr && line.trim() === "") {
        break; // End of QR block
      }
    }

    if (qrLines.length > 0) {
      return c.json({
        linked: false,
        qr: qrLines.join("\n"),
        qrType: "text",
        message: "Scan the QR code with WhatsApp on your phone.",
      });
    }

    // Alternative: look for raw QR data string (2:xxxx format used by Baileys)
    const qrDataMatch = output.match(/(?:QR|qr).*?([A-Za-z0-9+/=]{50,})/);
    if (qrDataMatch) {
      return c.json({
        linked: false,
        qr: qrDataMatch[1],
        qrType: "data",
        message: "QR code ready. Scan with WhatsApp.",
      });
    }

    return c.json({
      linked: false,
      qr: null,
      rawOutput: output.slice(-500), // Last 500 chars for debugging
      message: "Waiting for QR code generation...",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "QR check failed";
    return c.json({ error: msg }, 500);
  }
});

// ── GET /agents/:id/channels/whatsapp/status ───────────────────────────
// Checks if WhatsApp is connected and running.

channels.get("/:id/channels/whatsapp/status", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);
    const reachable = await ssh.ping(ip);

    if (!reachable) {
      return c.json({
        configured: false,
        linked: false,
        running: false,
        message: "Agent VPS is not reachable",
      });
    }

    // Check if whatsapp appears in config
    const configResult = await ssh.exec(ip, "grep -c whatsapp /home/agent/.openclaw/openclaw.json 2>/dev/null || echo 0");
    const configured = parseInt(configResult.stdout.trim()) > 0;

    const hasCreds = await hasWhatsAppCreds(ip);
    const gatewayState = await ssh.gatewayStatus(ip);
    const linked = hasCreds;
    const running = gatewayState === "active";

    return c.json({
      configured,
      linked,
      hasCreds,
      running,
      statusLine: linked
        ? "- WhatsApp default: enabled, configured, linked"
        : configured
          ? "- WhatsApp default: enabled, configured, not linked"
          : null,
      message: linked
        ? "WhatsApp is connected and running"
        : configured
          ? "WhatsApp is configured but not linked. Run setup to get QR code."
          : "WhatsApp is not configured",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Status check failed";
    return c.json({ error: msg }, 500);
  }
});

// ── POST /agents/:id/channels/whatsapp/disconnect ──────────────────────
// Removes WhatsApp config, logs out, restarts gateway.

channels.post("/:id/channels/whatsapp/disconnect", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);
    const reachable = await ssh.ping(ip);
    if (!reachable) {
      return c.json({ error: "Agent VPS is not reachable" }, 503);
    }

    // Logout WhatsApp
    await ssh.exec(ip, "openclaw channels logout --channel whatsapp 2>&1 || true");

    // Remove WhatsApp from config
    const config = await readOpenClawConfig(ip);
    const channels_config = (config.channels || {}) as Record<string, unknown>;
    delete channels_config.whatsapp;
    config.channels = channels_config;

    // Remove whatsapp plugin
    const plugins = (config.plugins || { entries: {} }) as { entries: Record<string, unknown> };
    if (plugins.entries) {
      delete plugins.entries.whatsapp;
    }
    config.plugins = plugins;

    // Write updated config
    await writeOpenClawConfig(ip, config);

    // Restart gateway
    await ssh.exec(ip, "sudo -n /bin/systemctl restart openclaw-gateway", { user: "agent" });

    // Update DB
    const agentConfig = (agent.config || {}) as Record<string, unknown>;
    delete agentConfig.whatsappEnabled;
    delete agentConfig.whatsappPhone;

    await supabase
      .from("agents")
      .update({
        config: agentConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    // Cleanup temp files
    await ssh.exec(ip, "rm -f /tmp/wa-login-output.txt");

    return c.json({ success: true, message: "WhatsApp disconnected" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Disconnect failed";
    return c.json({ error: msg }, 500);
  }
});

export default channels;
