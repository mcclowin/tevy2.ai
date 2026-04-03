import type { Context, Next } from "hono";
import { one, query } from "../lib/db.js";

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
      account = await one<{ id: string; email: string }>(
        "select id, email from public.accounts where id = $1 limit 1",
        [token]
      );
    }

    if (!account) {
      // Fallback: first account or create one
      const accounts = await query<{ id: string; email: string }>(
        "select id, email from public.accounts order by created_at asc limit 1"
      );

      account = accounts[0] || null;
      if (!account) {
        account = await one<{ id: string; email: string }>(
          `insert into public.accounts (email, plan)
           values ($1, $2)
           returning id, email`,
          ["dev@tevy2.ai", "starter"]
        );
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
    const account = await one<{ id: string; email: string | null }>(
      "select id, email from public.accounts where stytch_user_id = $1 limit 1",
      [stytchUserId]
    );

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
