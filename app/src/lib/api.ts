import { getAccessToken, signOut } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiOptions = {
  method?: string;
  body?: unknown;
};

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const token = await getAccessToken();

  if (!token && !path.startsWith("/api/auth")) {
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

// ── Agents (Hetzner VPS) ──────────────────────────────────────────────

export type Agent = {
  id: string;
  slug: string;
  state: string;
  liveStatus?: string;
  gateway_token?: string | null;
  hetzner_server_id: string;
  hetzner_ip: string;
  business_name: string;
  website_url: string | null;
  webchatUrl?: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentRuntime = {
  machineState: string;
  sshReachable: boolean;
  gatewayStatus: string;
  openclawVersion: string | null;
  imageRevision: string | null;
  updateScriptPresent: boolean;
};

export function createAgent(data: Record<string, unknown>) {
  return api<{ success: boolean; agent: Agent }>("/api/agents", {
    method: "POST",
    body: data,
  });
}

export function listAgents() {
  return api<{ agents: Agent[] }>("/api/agents");
}

export function getAgent(id: string) {
  return api<Agent>(`/api/agents/${id}`);
}

export function getAgentRuntime(id: string) {
  return api<AgentRuntime>(`/api/agents/${id}/runtime`);
}

export function startAgent(id: string) {
  return api<{ success: boolean; state: string }>(`/api/agents/${id}/start`, {
    method: "POST",
  });
}

export function stopAgent(id: string) {
  return api<{ success: boolean; state: string }>(`/api/agents/${id}/stop`, {
    method: "POST",
  });
}

export function deleteAgent(id: string) {
  return api<{ success: boolean }>(`/api/agents/${id}`, { method: "DELETE" });
}

export function updateAgent(id: string) {
  return api<{ success: boolean; output: string; runtime: AgentRuntime }>(`/api/agents/${id}/update`, {
    method: "POST",
  });
}

export function backupAgent(id: string) {
  return api<{ success: boolean; path: string }>(`/api/agents/${id}/backup`, {
    method: "POST",
  });
}

export function getBootStatus(id: string) {
  return api<{
    stage: string;
    progress: number;
    message: string;
    ready: boolean;
    webchatUrl?: string;
  }>(`/api/agents/${id}/boot-status`);
}

export function readAgentFile(id: string, filePath: string) {
  return api<{ path: string; content: string }>(
    `/api/agents/${id}/files/${filePath}`
  );
}

export function writeAgentFile(
  id: string,
  filePath: string,
  content: string,
  encoding: "utf8" | "base64" = "utf8"
) {
  return api<{ success: boolean; path: string }>(
    `/api/agents/${id}/files/${filePath}`,
    { method: "PUT", body: { content, encoding } }
  );
}

export function execOnAgent(id: string, command: string) {
  return api<{ stdout: string; stderr: string; exitCode: number }>(
    `/api/agents/${id}/ssh`,
    { method: "POST", body: { command } }
  );
}

// ── WhatsApp Channel ───────────────────────────────────────────────────

export type WhatsAppStatus = {
  configured: boolean;
  linked: boolean;
  hasCreds: boolean;
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

export function setupWhatsApp(agentId: string, data: { phoneNumber?: string; dmPolicy?: string }) {
  return api<{ success: boolean; message: string }>(
    `/api/agents/${agentId}/channels/whatsapp/setup`,
    { method: "POST", body: data }
  );
}

export function getWhatsAppStatus(agentId: string) {
  return api<WhatsAppStatus>(`/api/agents/${agentId}/channels/whatsapp/status`);
}

export function getWhatsAppQR(agentId: string) {
  return api<WhatsAppQR>(`/api/agents/${agentId}/channels/whatsapp/qr`);
}

export function disconnectWhatsApp(agentId: string) {
  return api<{ success: boolean; message: string }>(
    `/api/agents/${agentId}/channels/whatsapp/disconnect`,
    { method: "POST" }
  );
}
