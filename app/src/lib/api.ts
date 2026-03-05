import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiOptions = {
  method?: string;
  body?: unknown;
};

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const token = await getAccessToken();

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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data as T;
}

// Instances
export function createInstance(data: Record<string, unknown>) {
  return api<{
    success: boolean;
    instance: {
      id: string;
      name: string;
      status: string;
      webchatUrl: string;
      flyMachineId: string;
      region: string;
    };
  }>("/api/instances", { method: "POST", body: data });
}

export function listInstances() {
  return api<{ instances: Array<Record<string, unknown>> }>("/api/instances");
}

export function getInstance(id: string) {
  return api<Record<string, unknown>>(`/api/instances/${id}`);
}

export function startInstance(id: string) {
  return api(`/api/instances/${id}/start`, { method: "POST" });
}

export function stopInstance(id: string) {
  return api(`/api/instances/${id}/stop`, { method: "POST" });
}

export function deleteInstance(id: string) {
  return api(`/api/instances/${id}`, { method: "DELETE" });
}
