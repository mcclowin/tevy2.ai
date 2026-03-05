import { Hono } from "hono";
import { stytchClient } from "../lib/stytch.js";
import { supabase } from "../lib/supabase.js";
import { env } from "../env.js";

const auth = new Hono();

// POST /api/auth/magic-link — send magic link email
auth.post("/magic-link", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  try {
    await stytchClient.magicLinks.email.loginOrCreate({
      email,
      login_magic_link_url: `${env.FRONTEND_URL}/auth/callback`,
      signup_magic_link_url: `${env.FRONTEND_URL}/auth/callback`,
    });

    return c.json({ success: true, message: "Magic link sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send magic link";
    return c.json({ error: message }, 500);
  }
});

// POST /api/auth/verify — verify magic link token, return session
auth.post("/verify", async (c) => {
  const { token } = await c.req.json<{ token: string }>();

  if (!token) {
    return c.json({ error: "Token required" }, 400);
  }

  try {
    const result = await stytchClient.magicLinks.authenticate({
      token,
      session_duration_minutes: 60 * 24 * 7, // 1 week
    });

    const userId = result.user.user_id;
    const email = result.user.emails?.[0]?.email || "";

    // Upsert user in Supabase
    await supabase.from("users").upsert(
      {
        stytch_user_id: userId,
        email,
        last_login: new Date().toISOString(),
      },
      { onConflict: "stytch_user_id" }
    );

    return c.json({
      success: true,
      session_token: result.session_token,
      user: {
        id: userId,
        email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return c.json({ error: message }, 401);
  }
});

// POST /api/auth/logout — revoke session
auth.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: true }); // already logged out
  }

  try {
    await stytchClient.sessions.revoke({
      session_token: authHeader.slice(7),
    });
  } catch {
    // ignore errors on logout
  }

  return c.json({ success: true });
});

export default auth;
