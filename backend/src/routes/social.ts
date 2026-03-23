import { Hono } from "hono";
import {
  createSocialConnectSession,
  deleteSocialConnection,
  listSocialConnections,
  getSocialCredentials,
  socialProxy,
  SOCIAL_INTEGRATIONS,
  type SocialPlatform,
} from "../lib/nango.js";

const router = new Hono();

/**
 * POST /v1/social/connect
 * Create a Nango Connect session for a social platform.
 * Frontend uses the returned session token to open Nango's Connect UI.
 */
router.post("/connect", async (c) => {
  const account = c.get("account") as any;
  const body = await c.req.json();
  const { platform, agentId } = body;

  if (!platform || !SOCIAL_INTEGRATIONS[platform as SocialPlatform]) {
    return c.json(
      {
        error: "invalid_platform",
        message: `Platform must be one of: ${Object.keys(SOCIAL_INTEGRATIONS).join(", ")}`,
      },
      400
    );
  }

  if (!agentId) {
    return c.json({ error: "missing_agent_id", message: "agentId is required" }, 400);
  }

  try {
    const session = await createSocialConnectSession({
      agentId,
      accountId: account.id,
      platform: platform as SocialPlatform,
      userEmail: account.email,
    });

    return c.json({
      sessionToken: session.data.token,
      platform,
      agentId,
    });
  } catch (err: any) {
    console.error("Nango connect session error:", err);
    return c.json(
      { error: "connect_failed", message: err.message || "Failed to create connect session" },
      500
    );
  }
});

/**
 * GET /v1/social/connections
 * List all social connections for the authenticated account.
 */
router.get("/connections", async (c) => {
  const account = c.get("account") as any;

  try {
    const connections = await listSocialConnections(account.id);
    return c.json({
      connections: connections.map((conn: any) => ({
        id: conn.id,
        connectionId: conn.connection_id,
        platform: conn.provider_config_key,
        createdAt: conn.created_at,
        agentId: conn.tags?.organization_id,
      })),
    });
  } catch (err: any) {
    console.error("List connections error:", err);
    return c.json({ error: "list_failed", message: err.message }, 500);
  }
});

/**
 * DELETE /v1/social/connections/:platform/:connectionId
 * Disconnect a social account.
 */
router.delete("/connections/:platform/:connectionId", async (c) => {
  const platform = c.req.param("platform") as SocialPlatform;
  const connectionId = c.req.param("connectionId");

  if (!SOCIAL_INTEGRATIONS[platform]) {
    return c.json({ error: "invalid_platform" }, 400);
  }

  try {
    await deleteSocialConnection({ platform, connectionId });
    return c.json({ ok: true, disconnected: platform });
  } catch (err: any) {
    console.error("Delete connection error:", err);
    return c.json({ error: "disconnect_failed", message: err.message }, 500);
  }
});

/**
 * POST /v1/social/post
 * Post content to a connected social platform.
 * The bot calls this to publish approved content.
 */
router.post("/post", async (c) => {
  const body = await c.req.json();
  const { platform, connectionId, content, imageUrl } = body;

  if (!platform || !connectionId || !content) {
    return c.json(
      { error: "missing_fields", message: "platform, connectionId, and content are required" },
      400
    );
  }

  try {
    let result: any;

    switch (platform as SocialPlatform) {
      case "linkedin": {
        // LinkedIn UGC Post API
        result = await socialProxy({
          platform: "linkedin",
          connectionId,
          method: "POST",
          endpoint: "/v2/ugcPosts",
          data: {
            author: "urn:li:person:me", // Will be resolved by LinkedIn
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: content },
                shareMediaCategory: "NONE",
              },
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
          },
        });
        break;
      }

      case "instagram": {
        // Instagram requires image — use Container + Publish flow
        if (!imageUrl) {
          return c.json(
            { error: "image_required", message: "Instagram posts require an imageUrl" },
            400
          );
        }
        // Step 1: Create media container
        const container = await socialProxy({
          platform: "instagram",
          connectionId,
          method: "POST",
          endpoint: "/me/media",
          data: { image_url: imageUrl, caption: content },
        });
        // Step 2: Publish
        result = await socialProxy({
          platform: "instagram",
          connectionId,
          method: "POST",
          endpoint: "/me/media_publish",
          data: { creation_id: container.data?.id },
        });
        break;
      }

      case "facebook": {
        result = await socialProxy({
          platform: "facebook",
          connectionId,
          method: "POST",
          endpoint: "/me/feed",
          data: { message: content },
        });
        break;
      }

      case "twitter": {
        result = await socialProxy({
          platform: "twitter",
          connectionId,
          method: "POST",
          endpoint: "/2/tweets",
          data: { text: content },
        });
        break;
      }

      default:
        return c.json({ error: "unsupported_platform", message: `Posting to ${platform} not yet supported` }, 400);
    }

    return c.json({ ok: true, platform, result: result?.data || result });
  } catch (err: any) {
    console.error(`Social post error (${platform}):`, err);
    return c.json(
      { error: "post_failed", message: err.message || "Failed to post" },
      500
    );
  }
});

export default router;
