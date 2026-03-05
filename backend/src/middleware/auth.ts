import type { Context, Next } from "hono";
import { stytchClient } from "../lib/stytch.js";

// Middleware: extract + verify Stytch session from Authorization header
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authMiddleware(c: Context<any>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const sessionToken = authHeader.slice(7);

  try {
    const session = await stytchClient.sessions.authenticate({
      session_token: sessionToken,
    });

    // Attach user info to context
    c.set("userId", session.user.user_id);
    c.set("userEmail", session.user.emails?.[0]?.email || "");
    c.set("sessionToken", sessionToken);

    await next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid session";
    return c.json({ error: "Unauthorized", details: message }, 401);
  }
}
