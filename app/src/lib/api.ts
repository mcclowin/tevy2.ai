const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

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

// Auth
export function sendMagicLink(email: string) {
  return api("/api/auth/magic-link", { method: "POST", body: { email } });
}

export function verifyToken(token: string) {
  return api<{ session_token: string; user: { id: string; email: string } }>(
    "/api/auth/verify",
    { method: "POST", body: { token } }
  );
}

export function logout(sessionToken: string) {
  return api("/api/auth/logout", { method: "POST", token: sessionToken });
}

// Instances
export function createInstance(data: Record<string, unknown>, sessionToken: string) {
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
  }>("/api/instances", { method: "POST", body: data, token: sessionToken });
}

export function listInstances(sessionToken: string) {
  return api<{ instances: Array<Record<string, unknown>> }>("/api/instances", { token: sessionToken });
}

export function getInstance(id: string, sessionToken: string) {
  return api<Record<string, unknown>>(`/api/instances/${id}`, { token: sessionToken });
}

export function startInstance(id: string, sessionToken: string) {
  return api(`/api/instances/${id}/start`, { method: "POST", token: sessionToken });
}

export function stopInstance(id: string, sessionToken: string) {
  return api(`/api/instances/${id}/stop`, { method: "POST", token: sessionToken });
}

export function deleteInstance(id: string, sessionToken: string) {
  return api(`/api/instances/${id}`, { method: "DELETE", token: sessionToken });
}
