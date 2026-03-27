/**
 * Channel management routes — WhatsApp setup/status/disconnect
 *
 * POST   /api/agents/:id/channels/whatsapp/setup      → Patch config + start QR login
 * GET    /api/agents/:id/channels/whatsapp/status     → Check if WhatsApp is linked
 * GET    /api/agents/:id/channels/whatsapp/qr         → Get current QR code (if login in progress)
 * POST   /api/agents/:id/channels/whatsapp/disconnect → Remove WhatsApp config + restart
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

type AgentRow = {
  id: string;
  slug: string;
  hetzner_ip: string | null;
  hetzner_server_id: string;
  config: Record<string, unknown>;
};

type WhatsAppSetupBody = {
  phoneNumber?: string;
  dmPolicy?: "allowlist" | "open" | "pairing";
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

function normalizePhoneNumber(phone?: string): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[\s()-]/g, "");
}

function validateWhatsAppSetup(
  body: WhatsAppSetupBody
):
  | { ok: true; phoneNumber: string | null; dmPolicy: "allowlist" | "open" | "pairing" }
  | { ok: false; error: string } {
  const dmPolicy = body.dmPolicy || "allowlist";
  const phoneNumber = normalizePhoneNumber(body.phoneNumber);

  if (!["allowlist", "open", "pairing"].includes(dmPolicy)) {
    return { ok: false, error: "dmPolicy must be one of: allowlist, open, pairing" };
  }

  // Safe MVP: owner-only or pairing. Never silently fall back to open access.
  if (dmPolicy === "allowlist" && !phoneNumber) {
    return { ok: false, error: "phoneNumber is required for allowlist mode" };
  }

  if (dmPolicy === "open") {
    return {
      ok: false,
      error: "open mode is disabled for now. Use allowlist (owner-only) or pairing.",
    };
  }

  return { ok: true, phoneNumber, dmPolicy };
}

async function readOpenClawConfig(ip: string): Promise<Record<string, unknown>> {
  const result = await ssh.exec(ip, "cat /home/agent/.openclaw/openclaw.json");
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read openclaw.json: ${result.stderr}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    const parsed = await ssh.exec(
      ip,
      "node -e \"const fs=require('fs'); const j=require('/usr/lib/node_modules/openclaw/node_modules/json5/lib/index.js'); console.log(JSON.stringify(j.parse(fs.readFileSync('/home/agent/.openclaw/openclaw.json','utf8'))))\""
    );
    if (parsed.exitCode !== 0) {
      throw new Error(`Failed to parse openclaw.json: ${parsed.stderr}`);
    }
    return JSON.parse(parsed.stdout.trim());
  }
}

async function writeOpenClawConfig(ip: string, config: Record<string, unknown>): Promise<void> {
  const json = JSON.stringify(config, null, 2);
  const b64 = Buffer.from(json).toString("base64");
  const result = await ssh.exec(
    ip,
    `echo '${b64}' | base64 -d > /home/agent/.openclaw/openclaw.json && chmod 600 /home/agent/.openclaw/openclaw.json`
  );
  if (result.exitCode !== 0) {
    throw new Error(`Failed to write openclaw.json: ${result.stderr}`);
  }
}

async function hasWhatsAppCreds(ip: string): Promise<boolean> {
  const credsResult = await ssh.exec(
    ip,
    "ls -la /home/agent/.openclaw/credentials/whatsapp/*/creds.json 2>/dev/null || echo 'no creds'"
  );
  return !credsResult.stdout.includes("no creds");
}

async function hasWhatsAppPlugin(ip: string): Promise<boolean> {
  const result = await ssh.exec(
    ip,
    "node -e \"try{require.resolve('@openclaw/whatsapp');console.log('yes')}catch{console.log('no')}\" 2>/dev/null"
  );
  return result.stdout.trim().includes("yes");
}

async function installWhatsAppPlugin(ip: string): Promise<void> {
  const result = await ssh.exec(
    ip,
    "cd /home/agent && openclaw plugins install @openclaw/whatsapp 2>&1",
    { timeoutMs: 180_000 }
  );
  if (result.exitCode !== 0 && !(await hasWhatsAppPlugin(ip))) {
    throw new Error(`Failed to install WhatsApp plugin: ${result.stderr || result.stdout}`);
  }
}

channels.post("/:id/channels/whatsapp/setup", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");
  const body = await c.req.json<WhatsAppSetupBody>();

  const validated = validateWhatsAppSetup(body);
  if ("error" in validated) {
    return c.json({ error: validated.error }, 400);
  }

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);
    const reachable = await ssh.ping(ip);
    if (!reachable) {
      return c.json({ error: "Agent VPS is not reachable" }, 503);
    }

    const config = await readOpenClawConfig(ip);
    const channelsConfig = (config.channels || {}) as Record<string, unknown>;

    const allowFrom = validated.phoneNumber ? [validated.phoneNumber] : [];
    channelsConfig.whatsapp = {
      enabled: true,
      dmPolicy: validated.dmPolicy,
      allowFrom,
      groupPolicy: "disabled",
      sendReadReceipts: true,
      ...(validated.phoneNumber ? { selfChatMode: true } : {}),
    };
    config.channels = channelsConfig;

    const plugins = (config.plugins || { entries: {} }) as { entries: Record<string, { enabled: boolean }> };
    plugins.entries = plugins.entries || {};
    plugins.entries.whatsapp = { enabled: true };
    config.plugins = plugins;

    await writeOpenClawConfig(ip, config);
    await installWhatsAppPlugin(ip);

    // Match official flow: login first while gateway is stopped so login owns the socket.
    await ssh.exec(ip, "sudo -n /bin/systemctl stop openclaw-gateway || true", { user: "agent" });

    const loginResult = await ssh.exec(
      ip,
      `sh -lc 'rm -f /tmp/wa-login-output.txt && nohup sh -lc '"'"'cd /home/agent && timeout 120 openclaw channels login --channel whatsapp > /tmp/wa-login-output.txt 2>&1'"'"' >/dev/null 2>&1 < /dev/null & echo login_started'`,
      { timeoutMs: 15_000 }
    );

    if (!loginResult.stdout.includes("login_started")) {
      throw new Error(`Failed to launch WhatsApp login: ${loginResult.stderr || loginResult.stdout}`);
    }

    const agentConfig = (agent.config || {}) as Record<string, unknown>;
    agentConfig.whatsappEnabled = true;
    agentConfig.whatsappPhone = validated.phoneNumber || null;
    agentConfig.whatsappDmPolicy = validated.dmPolicy;
    agentConfig.whatsappGroupsEnabled = false;

    await supabase
      .from("agents")
      .update({
        config: agentConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    return c.json({
      success: true,
      message:
        validated.dmPolicy === "pairing"
          ? "WhatsApp setup initiated. Scan the QR, then approve pairings for new senders."
          : "WhatsApp setup initiated in owner-only mode. Scan the QR to finish linking.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "WhatsApp setup failed";
    console.error("WhatsApp setup error:", msg);
    return c.json({ error: msg }, 500);
  }
});

channels.get("/:id/channels/whatsapp/qr", async (c) => {
  const accountId = c.get("accountId");
  const agentId = c.req.param("id");

  const agent = await getAgentForAccount(accountId, agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  try {
    const ip = await resolveIp(agent);

    // QR polling must stay fast. Avoid `openclaw channels status` because it can block.
    if (await hasWhatsAppCreds(ip)) {
      const gatewayState = await ssh.gatewayStatus(ip);
      if (gatewayState !== "active") {
        try {
          await ssh.exec(ip, "sudo -n /bin/systemctl restart openclaw-gateway", { user: "agent" });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Gateway restart failed";
          return c.json({
            linked: true,
            qr: null,
            message: `WhatsApp linked, but gateway restart failed: ${msg}`,
          });
        }
      }
      return c.json({ linked: true, qr: null, message: "WhatsApp linked" });
    }

    const qrResult = await ssh.exec(ip, "cat /tmp/wa-login-output.txt 2>/dev/null || echo ''");
    const output = qrResult.stdout;

    if (!output || output.trim() === "") {
      return c.json({ linked: false, qr: null, message: "Waiting for QR code..." });
    }

    const lines = output.split("\n");
    const qrLines: string[] = [];
    let inQr = false;

    for (const line of lines) {
      if (line.includes("█") || line.includes("▀") || line.includes("▄") || line.includes("▐") || line.includes("▌")) {
        inQr = true;
        qrLines.push(line);
      } else if (inQr && line.trim() === "") {
        break;
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
      rawOutput: output.slice(-500),
      message: "Waiting for QR code generation...",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "QR check failed";
    return c.json({ error: msg }, 500);
  }
});

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
        hasCreds: false,
        pluginInstalled: false,
        running: false,
        message: "Agent VPS is not reachable",
      });
    }

    const configResult = await ssh.exec(ip, "grep -c whatsapp /home/agent/.openclaw/openclaw.json 2>/dev/null || echo 0");
    const configured = parseInt(configResult.stdout.trim()) > 0;
    const hasCreds = await hasWhatsAppCreds(ip);
    const pluginInstalled = await hasWhatsAppPlugin(ip);
    const running = (await ssh.gatewayStatus(ip)) === "active";

    return c.json({
      configured,
      linked: hasCreds,
      hasCreds,
      pluginInstalled,
      running,
      statusLine: hasCreds
        ? "- WhatsApp default: enabled, configured, linked"
        : configured
          ? "- WhatsApp default: enabled, configured, not linked"
          : null,
      message: !pluginInstalled
        ? "WhatsApp plugin is not installed"
        : hasCreds
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

    await ssh.exec(ip, "openclaw channels logout --channel whatsapp 2>&1 || true");

    const config = await readOpenClawConfig(ip);
    const channelsConfig = (config.channels || {}) as Record<string, unknown>;
    delete channelsConfig.whatsapp;
    config.channels = channelsConfig;

    const plugins = (config.plugins || { entries: {} }) as { entries: Record<string, unknown> };
    if (plugins.entries) {
      delete plugins.entries.whatsapp;
    }
    config.plugins = plugins;

    await writeOpenClawConfig(ip, config);
    await ssh.exec(ip, "sudo -n /bin/systemctl restart openclaw-gateway", { user: "agent" });

    const agentConfig = (agent.config || {}) as Record<string, unknown>;
    delete agentConfig.whatsappEnabled;
    delete agentConfig.whatsappPhone;
    delete agentConfig.whatsappDmPolicy;
    delete agentConfig.whatsappGroupsEnabled;

    await supabase
      .from("agents")
      .update({
        config: agentConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    await ssh.exec(ip, "rm -f /tmp/wa-login-output.txt");

    return c.json({ success: true, message: "WhatsApp disconnected" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Disconnect failed";
    return c.json({ error: msg }, 500);
  }
});

export default channels;
