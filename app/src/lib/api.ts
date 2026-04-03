import { getAccessToken, signOut } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiOptions = {
  method?: string;
  body?: unknown;
};

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const token = await getAccessToken();

  if (!token && !path.startsWith("/v1/auth")) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data as T;
}

// ── Agents ────────────────────────────────────────────────────────────

export type Agent = {
  id: string;
  name: string;
  runtime: string;
  provider: string;
  state: string;
  liveStatus?: string;
  server_id: string;
  ip: string | null;
  config: Record<string, unknown>;
  exposed_secrets?: string[];
  created_at: string;
  updated_at: string;
  // Convenience accessors for config fields
  business_name?: string;
  slug?: string;
  hetzner_ip?: string;
  webchatUrl?: string;
  gateway_token?: string | null;
};

export type AgentRuntime = {
  sshReachable: boolean;
  gatewayStatus: string;
  version: string | null;
  runtime?: string;
  // Legacy compat
  openclawVersion?: string | null;
  imageRevision?: string | null;
  machineState?: string;
  updateScriptPresent?: boolean;
};

export function createAgent(data: {
  name: string;
  runtime?: string;
  model?: string;
  exposedSecrets?: string[];
  files?: Record<string, string>;
  config?: Record<string, unknown>;
  // Tevy2-specific fields passed through
  ownerName?: string;
  businessName?: string;
  [key: string]: unknown;
}) {
  return api<{ id: string; name: string; runtime: string; state: string; ip: string | null; agent?: Agent }>("/v1/agents", {
    method: "POST",
    body: data,
  });
}

export function listAgents() {
  return api<{ agents: Agent[] }>("/v1/agents");
}

export function getAgent(id: string) {
  return api<Agent>(`/v1/agents/${id}`);
}

export function getAgentRuntime(id: string) {
  return api<AgentRuntime>(`/v1/agents/${id}/runtime`);
}

export function startAgent(id: string) {
  return api<{ success: boolean; state: string }>(`/v1/agents/${id}/start`, {
    method: "POST",
  });
}

export function stopAgent(id: string) {
  return api<{ success: boolean; state: string }>(`/v1/agents/${id}/stop`, {
    method: "POST",
  });
}

export function deleteAgent(id: string) {
  return api<{ success: boolean }>(`/v1/agents/${id}`, { method: "DELETE" });
}

export function updateAgent(id: string) {
  return api<{ success: boolean; output: string; runtime: AgentRuntime }>(`/v1/agents/${id}/update`, {
    method: "POST",
  });
}

export function backupAgent(id: string) {
  return api<{ success: boolean; path: string }>(`/v1/agents/${id}/backup`, {
    method: "POST",
  });
}

export function getBootStatus(id: string) {
  return api<{
    stage: string;
    progress: number;
    message: string;
    ready: boolean;
  }>(`/v1/agents/${id}/boot-status`);
}

export function readAgentFile(id: string, filePath: string) {
  return api<{ path: string; content: string }>(
    `/v1/agents/${id}/files/${filePath}`
  );
}

export function writeAgentFile(
  id: string,
  filePath: string,
  content: string,
  encoding: "utf8" | "base64" = "utf8"
) {
  return api<{ success: boolean; path: string }>(
    `/v1/agents/${id}/files/${filePath}`,
    { method: "PUT", body: { content, encoding } }
  );
}

export function execOnAgent(id: string, command: string) {
  return api<{ stdout: string; stderr: string; exitCode: number }>(
    `/v1/agents/${id}/ssh`,
    { method: "POST", body: { command } }
  );
}

// ── Secrets ───────────────────────────────────────────────────────────

export function putSecrets(secrets: Record<string, string>) {
  return api<{ success: boolean; keys: string[] }>("/v1/secrets", {
    method: "PUT",
    body: secrets,
  });
}

export function listSecrets() {
  return api<{ keys: { name: string; scope: string; created_at: string }[] }>("/v1/secrets");
}

// ── Usage ─────────────────────────────────────────────────────────────

export function getAccountUsage(days = 30) {
  return api<Record<string, unknown>>(`/v1/usage?days=${days}`);
}

export function getAgentUsage(id: string, days = 30) {
  return api<Record<string, unknown>>(`/v1/agents/${id}/usage?days=${days}`);
}

// ── WhatsApp (stubs — channel management TBD) ────────────────────────

export type WhatsAppStatus = {
  configured: boolean;
  linked: boolean;
  hasCreds: boolean;
  pluginInstalled?: boolean;
  running: boolean;
  statusLine: string | null;
  message: string;
};

export type WhatsAppQR = {
  linked: boolean;
  qr: string | null;
  qrType?: "text" | "data";
  rawOutput?: string;
  message: string;
};

export function setupWhatsApp(_agentId: string, _data: { phoneNumber?: string; dmPolicy?: string }) {
  return Promise.resolve({ success: false, message: "WhatsApp channel management coming soon" });
}

export function getWhatsAppStatus(_agentId: string): Promise<WhatsAppStatus> {
  return Promise.resolve({
    configured: false, linked: false, hasCreds: false, running: false,
    statusLine: null, message: "WhatsApp channel management coming soon",
  });
}

export function getWhatsAppQR(_agentId: string): Promise<WhatsAppQR> {
  return Promise.resolve({ linked: false, qr: null, message: "Not available" });
}

export function disconnectWhatsApp(_agentId: string) {
  return Promise.resolve({ success: false, message: "WhatsApp channel management coming soon" });
}
