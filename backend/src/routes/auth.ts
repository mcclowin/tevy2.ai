import { Hono } from "hono";
import { one } from "../lib/db.js";
import { env } from "../env.js";

const auth = new Hono();

// POST /api/auth/magic-link — send magic link (or instant dev login)
auth.post("/magic-link", async (c) => {
  const { email, invite_code } = await c.req.json<{ email: string; invite_code?: string }>();

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  // Check if this is a new user who needs an invite code
  const existing = await one<{ id: string }>(
    "select id from public.accounts where email = $1 limit 1",
    [email]
  );

  if (!existing && env.BETA_INVITE_CODE) {
    if (!invite_code) {
      return c.json({ error: "invite_code_required", invite_code_required: true }, 403);
    }
    if (invite_code !== env.BETA_INVITE_CODE) {
      return c.json({ error: "Invalid invite code" }, 403);
    }
  }

  // Dev bypass: instant login, no Stytch
  if (env.DEV_BYPASS_AUTH) {
    // Upsert account in DB
    const account = await one<{ id: string; email: string }>(
      `insert into public.accounts (email, updated_at)
       values ($1, now())
       on conflict (email)
       do update set updated_at = now()
       returning id, email`,
      [email]
    );

    if (!account) {
      return c.json({ error: "Failed to create account" }, 500);
    }

    return c.json({
      success: true,
      dev_bypass: true,
      session_token: `dev_${account.id}`,
      user: {
        id: account.id,
        email,
      },
    });
  }

  // Production: send magic link via Stytch
  try {
    const { stytchClient } = await import("../lib/stytch.js");
    await stytchClient.magicLinks.email.loginOrCreate({
      email,
      login_magic_link_url: `${env.FRONTEND_URL}/auth/callback`,
      signup_magic_link_url: `${env.FRONTEND_URL}/auth/callback`,
    });

    return c.json({ success: true, message: "Magic link sent" });
  } catch (err: unknown) {
    console.error("Stytch magic link error:", err);
    const message = err instanceof Error ? err.message : "Failed to send magic link";
    return c.json({ error: message }, 500);
  }
});

// POST /api/auth/authenticate — verify magic link token from Stytch redirect
auth.post("/authenticate", async (c) => {
  const { token } = await c.req.json<{ token: string }>();

  if (!token) {
    return c.json({ error: "Token required" }, 400);
  }

  try {
    const { stytchClient } = await import("../lib/stytch.js");
    const response = await stytchClient.magicLinks.authenticate({
      token,
      session_duration_minutes: 60 * 24 * 7,
    });

    const stytchUserId = response.user_id;
    const userEmail = response.user.emails?.[0]?.email || "";

    // Upsert account in DB
    const account = await one<{ id: string; email: string }>(
      `insert into public.accounts (email, stytch_user_id, updated_at)
       values ($1, $2, now())
       on conflict (email)
       do update set stytch_user_id = excluded.stytch_user_id, updated_at = now()
       returning id, email`,
      [userEmail, stytchUserId]
    );

    if (!account) {
      throw new Error("Failed to create account");
    }

    return c.json({
      success: true,
      session_token: response.session_token,
      session_jwt: response.session_jwt,
      user: {
        id: account.id,
        email: userEmail,
      },
    });
  } catch (err: unknown) {
    console.error("Stytch authenticate error:", err);
    const message = err instanceof Error ? err.message : "Authentication failed";
    return c.json({ error: message }, 401);
  }
});

// POST /api/auth/logout
auth.post("/logout", async (c) => {
  const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");

  if (sessionToken && !sessionToken.startsWith("dev_")) {
    try {
      const { stytchClient } = await import("../lib/stytch.js");
      await stytchClient.sessions.revoke({ session_token: sessionToken });
    } catch { /* already expired */ }
  }

  return c.json({ success: true });
});

// GET /api/auth/me — get current user
auth.get("/me", async (c) => {
  const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!sessionToken) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Dev bypass: extract account ID from dev token (only when bypass enabled)
  if (sessionToken.startsWith("dev_")) {
    if (!env.DEV_BYPASS_AUTH) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    const accountId = sessionToken.replace("dev_", "");
    const account = await one<{ id: string; email: string }>(
      "select id, email from public.accounts where id = $1 limit 1",
      [accountId]
    );

    if (!account) return c.json({ error: "Not authenticated" }, 401);

    return c.json({
      id: account.id,
      email: account.email,
      name: null,
    });
  }

  // Production: validate via Stytch
  try {
    const { stytchClient } = await import("../lib/stytch.js");
    const response = await stytchClient.sessions.authenticate({
      session_token: sessionToken,
    });

    const stytchUserId = response.user?.user_id || response.session?.user_id;
    const userEmail = response.user?.emails?.[0]?.email || "";

    const account = await one<{ id: string; email: string | null }>(
      "select id, email from public.accounts where stytch_user_id = $1 limit 1",
      [stytchUserId]
    );

    return c.json({
      id: account?.id || stytchUserId,
      email: userEmail,
      name: null,
    });
  } catch {
    return c.json({ error: "Not authenticated" }, 401);
  }
});

export default auth;
