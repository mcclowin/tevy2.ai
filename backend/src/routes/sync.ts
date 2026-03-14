/**
 * Heartbeat Sync API — Bot pulls config changes + tasks from dashboard
 *
 * Architecture:
 *   Dashboard (source of truth) ←→ Bot (downstream copy)
 *   Bot calls GET /api/sync every 30min via OpenClaw cron
 *   Bot sends results back via POST /api/sync/report
 *
 * Auth: Bot authenticates with its gateway_token (same token used for gateway WebSocket)
 */

import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const sync = new Hono();

// Middleware: authenticate bot by gateway token (not user session)
async function botAuth(c: any, next: any) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Missing bot token" }, 401);
  }
  const token = auth.slice(7);

  // Look up instance by gateway token
  const { data, error } = await supabase
    .from("instances")
    .select("id, user_id, fly_machine_name, config, config_version, business_name, website_url")
    .eq("gateway_token", token)
    .neq("status", "deleted")
    .single();

  if (error || !data) {
    return c.json({ error: "Invalid bot token" }, 401);
  }

  c.set("instance", data);
  await next();
}

sync.use("*", botAuth);

/**
 * GET /api/sync?since_version=N
 *
 * Bot calls this on heartbeat. Returns any config changes since version N
 * and any pending tasks assigned from the dashboard.
 */
sync.get("/", async (c) => {
  const instance = c.get("instance") as any;
  const sinceVersion = parseInt(c.req.query("since_version") || "0");
  const currentVersion = instance.config_version || 0;

  const response: {
    version: number;
    changes: Array<{ file: string; action: string; content: string }>;
    tasks: Array<{ id: string; type: string; brief: string; metadata?: any }>;
  } = {
    version: currentVersion,
    changes: [],
    tasks: [],
  };

  // 1. Check for config changes
  if (currentVersion > sinceVersion) {
    const config = instance.config as Record<string, any> || {};

    // Rebuild files that might have changed
    // USER.md
    response.changes.push({
      file: "USER.md",
      action: "update",
      content: generateUserMd(instance, config),
    });

    // Brand profile
    const { data: brandData } = await supabase
      .from("brand_profiles")
      .select("content, updated_at")
      .eq("instance_id", instance.id)
      .single();

    if (brandData) {
      response.changes.push({
        file: "memory/brand-profile.md",
        action: "update",
        content: brandData.content,
      });
    }

    // Competitors
    const { data: competitorsData } = await supabase
      .from("competitors")
      .select("content, updated_at")
      .eq("instance_id", instance.id)
      .single();

    if (competitorsData) {
      response.changes.push({
        file: "memory/competitors.md",
        action: "update",
        content: competitorsData.content,
      });
    }
  }

  // 2. Get pending tasks (assigned from dashboard, not yet picked up)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, type, brief, metadata, created_at")
    .eq("instance_id", instance.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (tasks && tasks.length > 0) {
    response.tasks = tasks.map((t) => ({
      id: t.id,
      type: t.type,
      brief: t.brief,
      metadata: t.metadata,
    }));

    // Mark tasks as "in_progress"
    const taskIds = tasks.map((t) => t.id);
    await supabase
      .from("tasks")
      .update({ status: "in_progress", picked_up_at: new Date().toISOString() })
      .in("id", taskIds);
  }

  // 3. Log the heartbeat
  await supabase.from("heartbeats").insert({
    instance_id: instance.id,
    since_version: sinceVersion,
    current_version: currentVersion,
    changes_sent: response.changes.length,
    tasks_sent: response.tasks.length,
  });

  return c.json(response);
});

/**
 * POST /api/sync/report
 *
 * Bot sends results back after completing tasks.
 * E.g., drafted posts, research results, SEO audits.
 */
sync.post("/report", async (c) => {
  const instance = c.get("instance") as any;
  const body = await c.req.json<{
    task_id?: string;
    type: string;
    results: any;
  }>();

  if (!body.type) {
    return c.json({ error: "type is required" }, 400);
  }

  // Store the report
  const { error } = await supabase.from("reports").insert({
    instance_id: instance.id,
    task_id: body.task_id || null,
    type: body.type,
    results: body.results,
  });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  // If this was for a specific task, mark it as completed
  if (body.task_id) {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", body.task_id);
  }

  // Special handling for draft posts — create approval entries
  if (body.type === "draft_posts" && Array.isArray(body.results?.drafts)) {
    const approvals = body.results.drafts.map((draft: any) => ({
      instance_id: instance.id,
      task_id: body.task_id,
      platform: draft.platform || "unknown",
      content: draft.content,
      media_url: draft.media_url || null,
      scheduled_for: draft.scheduled_for || null,
      status: "pending_approval",
    }));

    await supabase.from("approvals").insert(approvals);
  }

  return c.json({ success: true });
});

/**
 * GET /api/sync/approvals
 *
 * Bot checks for approved/rejected posts.
 */
sync.get("/approvals", async (c) => {
  const instance = c.get("instance") as any;

  const { data } = await supabase
    .from("approvals")
    .select("*")
    .eq("instance_id", instance.id)
    .in("status", ["approved", "rejected"])
    .eq("bot_notified", false)
    .order("updated_at", { ascending: true })
    .limit(10);

  if (data && data.length > 0) {
    // Mark as notified
    const ids = data.map((a) => a.id);
    await supabase
      .from("approvals")
      .update({ bot_notified: true })
      .in("id", ids);
  }

  return c.json({ approvals: data || [] });
});

// Helper: generate USER.md from instance config
function generateUserMd(instance: any, config: any): string {
  const socials = config.socials || {};
  let md = `# USER.md — About the Business Owner

- **Name:** ${config.ownerName || "Business Owner"}
- **Business:** ${instance.business_name || "My Business"}
- **Website:** ${instance.website_url || ""}
- **Timezone:** ${config.timezone || "UTC"}
- **Chat channel:** ${config.chatChannel || "webchat"}

## Social Accounts
`;
  if (socials.instagram) md += `- **Instagram:** ${socials.instagram}\n`;
  if (socials.tiktok) md += `- **TikTok:** ${socials.tiktok}\n`;
  if (socials.linkedin) md += `- **LinkedIn:** ${socials.linkedin}\n`;
  if (socials.twitter) md += `- **X/Twitter:** ${socials.twitter}\n`;
  if (socials.facebook) md += `- **Facebook:** ${socials.facebook}\n`;

  md += `\n## Posting Goal\n${config.postingGoal || "3-4 posts per week"}\n`;

  return md;
}

export default sync;
