/**
 * Approvals API — Dashboard manages post approval workflow
 *
 * Owner sees drafts from Tevy, can approve/reject/edit them.
 */

import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    sessionToken: string;
  };
};

const approvals = new Hono<AuthEnv>();
approvals.use("*", authMiddleware);

// Helper: get user's instance ID
async function getUserInstanceId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("instances")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .single();
  return data?.id || null;
}

// GET /api/approvals — list all approvals for user's instance
approvals.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const status = c.req.query("status"); // optional filter
  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  let query = supabase
    .from("approvals")
    .select("*")
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ approvals: data || [] });
});

// POST /api/approvals/:id/approve — approve a draft
approvals.post("/:id/approve", async (c) => {
  const userId = c.get("userId") as string;
  const approvalId = c.req.param("id");
  const body = await c.req.json<{ scheduled_for?: string; notes?: string }>().catch(() => ({}));

  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  const { data, error } = await supabase
    .from("approvals")
    .update({
      status: "approved",
      scheduled_for: body.scheduled_for || null,
      owner_notes: body.notes || null,
      bot_notified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("instance_id", instanceId)
    .select()
    .single();

  if (error || !data) return c.json({ error: "Approval not found" }, 404);

  // Bump config version to trigger bot sync
  await supabase.rpc("increment_config_version", { inst_id: instanceId });

  return c.json({ success: true, approval: data });
});

// POST /api/approvals/:id/reject — reject a draft
approvals.post("/:id/reject", async (c) => {
  const userId = c.get("userId") as string;
  const approvalId = c.req.param("id");
  const body = await c.req.json<{ notes?: string }>().catch(() => ({}));

  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  const { data, error } = await supabase
    .from("approvals")
    .update({
      status: "rejected",
      owner_notes: body.notes || null,
      bot_notified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("instance_id", instanceId)
    .select()
    .single();

  if (error || !data) return c.json({ error: "Approval not found" }, 404);

  return c.json({ success: true, approval: data });
});

// PUT /api/approvals/:id — edit a draft's content
approvals.put("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const approvalId = c.req.param("id");
  const body = await c.req.json<{
    content?: string;
    platform?: string;
    scheduled_for?: string;
  }>();

  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.content) updates.content = body.content;
  if (body.platform) updates.platform = body.platform;
  if (body.scheduled_for) updates.scheduled_for = body.scheduled_for;

  const { data, error } = await supabase
    .from("approvals")
    .update(updates)
    .eq("id", approvalId)
    .eq("instance_id", instanceId)
    .select()
    .single();

  if (error || !data) return c.json({ error: "Approval not found" }, 404);

  return c.json({ success: true, approval: data });
});

export default approvals;
