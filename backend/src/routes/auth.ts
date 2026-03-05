import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { env } from "../env.js";

const auth = new Hono();

// POST /api/auth/magic-link — send magic link via Supabase
auth.post("/magic-link", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (error) throw error;

    return c.json({ success: true, message: "Magic link sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send magic link";
    return c.json({ error: message }, 500);
  }
});

// POST /api/auth/verify-otp — verify OTP code (alternative to magic link)
auth.post("/verify-otp", async (c) => {
  const { email, token } = await c.req.json<{ email: string; token: string }>();

  if (!email || !token) {
    return c.json({ error: "Email and token required" }, 400);
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) throw error;

    return c.json({
      success: true,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return c.json({ error: message }, 401);
  }
});

// POST /api/auth/refresh — refresh access token
auth.post("/refresh", async (c) => {
  const { refresh_token } = await c.req.json<{ refresh_token: string }>();

  if (!refresh_token) {
    return c.json({ error: "refresh_token required" }, 400);
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw error;

    return c.json({
      success: true,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return c.json({ error: message }, 401);
  }
});

// POST /api/auth/logout — sign out
auth.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Supabase admin can revoke sessions
    // For now just acknowledge — client clears its tokens
  }
  return c.json({ success: true });
});

// GET /api/auth/me — get current user (requires auth header)
auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data.user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  return c.json({
    id: data.user.id,
    email: data.user.email,
    created_at: data.user.created_at,
  });
});

export default auth;
