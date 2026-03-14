/**
 * Tasks API — Dashboard creates tasks for the bot to execute
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

const tasks = new Hono<AuthEnv>();
tasks.use("*", authMiddleware);

async function getUserInstanceId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("instances")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .single();
  return data?.id || null;
}

// GET /api/tasks — list tasks
tasks.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const status = c.req.query("status");
  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ tasks: data || [] });
});

// POST /api/tasks — create a task for the bot
tasks.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json<{
    type: string;
    brief: string;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.type || !body.brief) {
    return c.json({ error: "type and brief are required" }, 400);
  }

  const instanceId = await getUserInstanceId(userId);
  if (!instanceId) return c.json({ error: "No instance found" }, 404);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      instance_id: instanceId,
      type: body.type,
      brief: body.brief,
      metadata: body.metadata || {},
      status: "pending",
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  // Bump config version so bot picks it up faster
  await supabase.rpc("increment_config_version", { inst_id: instanceId });

  return c.json({ success: true, task: data });
});

export default tasks;
