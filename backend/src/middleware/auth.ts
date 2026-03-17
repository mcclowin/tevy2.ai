import type { Context, Next } from "hono";
import { supabase } from "../lib/supabase.js";
import { env } from "../env.js";

// Middleware: verify Stytch session token from Authorization header
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authMiddleware(c: Context<any>, next: Next) {
  // Dev mode: bypass auth
  if (process.env.DEV_BYPASS_AUTH === "true") {
    // Try to extract account ID from dev token (dev_<uuid>)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.startsWith("Bearer dev_") ? authHeader.slice(11) : null;

    let account: { id: string; email: string } | null = null;

    if (token) {
      const { data } = await supabase
        .from("accounts")
        .select("id, email")
        .eq("id", token)
        .single();
      account = data;
    }

    if (!account) {
      // Fallback: first account or create one
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, email")
        .limit(1);

      account = accounts?.[0] || null;
      if (!account) {
        const { data } = await supabase
          .from("accounts")
          .insert({ email: "dev@tevy2.ai", plan: "starter" })
          .select()
          .single();
        account = data;
      }
    }

    c.set("userId", account!.id);
    c.set("userEmail", account!.email);
    c.set("accountId", account!.id);
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const sessionToken = authHeader.slice(7);

  try {
    // Verify session with Stytch (lazy import to avoid crash when not configured)
    const { stytchClient } = await import("../lib/stytch.js");

    const response = await stytchClient.sessions.authenticate({
      session_token: sessionToken,
    });

    const stytchUserId = response.user?.user_id || response.session?.user_id;
    const userEmail = response.user?.emails?.[0]?.email || "";

    if (!stytchUserId) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Look up our internal account
    const { data: account } = await supabase
      .from("accounts")
      .select("id, email")
      .eq("stytch_user_id", stytchUserId)
      .single();

    if (!account) {
      return c.json({ error: "Account not found" }, 401);
    }

    c.set("userId", account.id);
    c.set("userEmail", account.email || userEmail);
    c.set("accountId", account.id);

    await next();
  } catch (err: unknown) {
    console.error("Auth middleware error:", err);
    return c.json({ error: "Unauthorized" }, 401);
  }
}
