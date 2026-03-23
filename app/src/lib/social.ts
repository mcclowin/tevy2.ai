import Nango from "@nangohq/frontend";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nango = new Nango();

export type SocialPlatform = "linkedin" | "instagram" | "facebook" | "tiktok" | "twitter";

/**
 * Start the social account connection flow.
 * Opens Nango's Connect UI which handles the OAuth redirect.
 */
export async function connectSocialAccount(opts: {
  platform: SocialPlatform;
  agentId: string;
  authToken: string;
  onSuccess?: (connectionId: string) => void;
  onError?: (error: string) => void;
}) {
  try {
    // 1. Get session token from our backend
    const res = await fetch(`${API_BASE}/api/social/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.authToken}`,
      },
      body: JSON.stringify({
        platform: opts.platform,
        agentId: opts.agentId,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create connect session");
    }

    const { sessionToken } = await res.json();

    // 2. Open Nango Connect UI
    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "connect") {
          opts.onSuccess?.(event.payload.connectionId);
        } else if (event.type === "close") {
          // User closed the modal
        }
      },
    });

    connect.setSessionToken(sessionToken);
  } catch (err: any) {
    opts.onError?.(err.message || "Connection failed");
  }
}

/**
 * List connected social accounts.
 */
export async function listSocialConnections(authToken: string): Promise<
  Array<{
    id: string;
    connectionId: string;
    platform: string;
    createdAt: string;
    agentId: string;
  }>
> {
  const res = await fetch(`${API_BASE}/api/social/connections`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!res.ok) throw new Error("Failed to list connections");
  const data = await res.json();
  return data.connections || [];
}

/**
 * Disconnect a social account.
 */
export async function disconnectSocialAccount(opts: {
  platform: string;
  connectionId: string;
  authToken: string;
}) {
  const res = await fetch(
    `${API_BASE}/api/social/connections/${opts.platform}/${opts.connectionId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${opts.authToken}` },
    }
  );

  if (!res.ok) throw new Error("Failed to disconnect");
  return res.json();
}
