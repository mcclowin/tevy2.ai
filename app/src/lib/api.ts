import { getAccessToken, signOut } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type ApiOptions = {
  method?: string;
  body?: unknown;
};

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const token = await getAccessToken();

  if (!token && !path.startsWith("/api/auth")) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : {};

  if (res.status === 401) {
    signOut();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    console.error("API error", { path, status: res.status, data });
    throw new Error(extractError(data, res.status));
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function extractError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    if ("error" in data && typeof data.error === "string") return data.error;
    if ("message" in data && typeof data.message === "string") return data.message;
  }
  return `API error: ${status}`;
}

export type Agent = {
  id: string;
  name: string;
  runtime: string;
  provider: string;
  state: string;
  liveStatus?: string;
  server_id?: string;
  ip: string | null;
  config: Record<string, unknown>;
  exposed_secrets?: string[];
  created_at: string;
  updated_at: string;
  business_name?: string;
  slug?: string;
  hetzner_ip?: string | null;
  webchatUrl?: string;
  gateway_token?: string | null;
};

export type AgentRuntime = {
  sshReachable: boolean;
  gatewayStatus: string;
  version?: string | null;
  openclawVersion?: string | null;
  imageRevision?: string | null;
  machineState?: string;
  updateScriptPresent?: boolean;
};

export function createAgent(data: {
  name?: string;
  ownerName?: string;
  businessName?: string;
  websiteUrl?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  competitors?: string;
  postingGoal?: string;
  telegramBotToken?: string;
}) {
  return api<{ success: boolean; agent: Agent }>("/api/agents", { method: "POST", body: data });
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
  return api<Record<string, unknown>>(`/api/agents/${id}/start`, { method: "POST" });
}

export function stopAgent(id: string) {
  return api<Record<string, unknown>>(`/api/agents/${id}/stop`, { method: "POST" });
}

export function deleteAgent(id: string) {
  return api<{ success: boolean }>(`/api/agents/${id}`, { method: "DELETE" });
}

export function updateAgent(id: string) {
  return api<{ success?: boolean; output?: string; runtime?: AgentRuntime }>(`/api/agents/${id}/update`, { method: "POST" });
}

export function backupAgent(id: string) {
  return api<Record<string, unknown>>(`/api/agents/${id}/backup`, { method: "POST" });
}

export function getBootStatus(id: string) {
  return api<{ stage: string; progress: number; message: string; ready: boolean }>(`/api/agents/${id}/boot-status`);
}

export function readAgentFile(id: string, filePath: string) {
  return api<{ path: string; content: string }>(`/api/agents/${id}/files/${filePath}`);
}

export function writeAgentFile(id: string, filePath: string, content: string, encoding: "utf8" | "base64" = "utf8") {
  return api<{ success: boolean; path: string }>(`/api/agents/${id}/files/${filePath}`, {
    method: "PUT",
    body: { content, encoding },
  });
}

export function execOnAgent(id: string, command: string) {
  return api<{ stdout: string; stderr: string; exitCode: number }>(`/api/agents/${id}/ssh`, {
    method: "POST",
    body: { command },
  });
}

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
  return Promise.resolve({ configured: false, linked: false, hasCreds: false, running: false, statusLine: null, message: "WhatsApp channel management coming soon" });
}

export function getWhatsAppQR(_agentId: string): Promise<WhatsAppQR> {
  return Promise.resolve({ linked: false, qr: null, message: "Not available" });
}

export function disconnectWhatsApp(_agentId: string) {
  return Promise.resolve({ success: false, message: "WhatsApp channel management coming soon" });
}
