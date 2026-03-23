import { Nango } from "@nangohq/node";
import { env } from "../env.js";

let nangoClient: Nango | null = null;

export function getNango(): Nango {
  if (!nangoClient) {
    const secretKey = process.env.NANGO_SECRET_KEY;
    if (!secretKey) {
      throw new Error("NANGO_SECRET_KEY is not set");
    }
    nangoClient = new Nango({ secretKey });
  }
  return nangoClient;
}

/**
 * Supported social platforms and their Nango integration IDs.
 * These must match the integration names configured in the Nango dashboard.
 */
export const SOCIAL_INTEGRATIONS = {
  linkedin: "linkedin",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok-accounts",
  twitter: "twitter-v2",
} as const;

export type SocialPlatform = keyof typeof SOCIAL_INTEGRATIONS;

/**
 * Create a Nango Connect session for a customer to authorize a social platform.
 * Returns a session token that the frontend uses to open the Connect UI.
 */
export async function createSocialConnectSession(opts: {
  agentId: string;
  accountId: string;
  platform: SocialPlatform;
  userEmail?: string;
}) {
  const nango = getNango();
  const integrationId = SOCIAL_INTEGRATIONS[opts.platform];

  const session = await nango.createConnectSession({
    tags: {
      end_user_id: opts.accountId,
      end_user_email: opts.userEmail || "",
      organization_id: opts.agentId,
    },
    allowed_integrations: [integrationId],
  });

  return session;
}

/**
 * Get the credentials for a social connection.
 * Used by the bot to make API calls on behalf of the customer.
 */
export async function getSocialCredentials(opts: {
  platform: SocialPlatform;
  connectionId: string;
}) {
  const nango = getNango();
  const integrationId = SOCIAL_INTEGRATIONS[opts.platform];

  const connection = await nango.getConnection(integrationId, opts.connectionId);
  return connection.credentials;
}

/**
 * List all connections for an account.
 */
export async function listSocialConnections(accountId: string) {
  const nango = getNango();
  const { connections } = await nango.listConnections();

  // Filter by account ID tag
  return connections.filter(
    (c: any) => c.tags?.end_user_id === accountId || c.tags?.organization_id === accountId
  );
}

/**
 * Delete a social connection.
 */
export async function deleteSocialConnection(opts: {
  platform: SocialPlatform;
  connectionId: string;
}) {
  const nango = getNango();
  const integrationId = SOCIAL_INTEGRATIONS[opts.platform];
  await nango.deleteConnection(integrationId, opts.connectionId);
}

/**
 * Make an authenticated API request through Nango's proxy.
 * Nango handles token refresh automatically.
 */
export async function socialProxy(opts: {
  platform: SocialPlatform;
  connectionId: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
}) {
  const nango = getNango();
  const integrationId = SOCIAL_INTEGRATIONS[opts.platform];

  const response = await nango.proxy({
    method: opts.method,
    baseUrlOverride: undefined,
    endpoint: opts.endpoint,
    providerConfigKey: integrationId,
    connectionId: opts.connectionId,
    data: opts.data,
    headers: opts.headers,
  });

  return response;
}
