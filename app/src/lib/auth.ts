"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function sendMagicLink(email: string) {
  const res = await fetch(`${API_URL}/api/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("magic-link failed", { status: res.status, data });
    throw new Error(data.error || "Failed to send magic link");
  }

  if (data.dev_bypass && data.session_token) {
    localStorage.setItem("tevy_session_token", data.session_token);
    localStorage.setItem("tevy_user_id", data.user.id);
    localStorage.setItem("tevy_user_email", data.user.email);
  }

  return data;
}

export async function authenticateToken(token: string) {
  const res = await fetch(`${API_URL}/api/auth/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("authenticate failed", { status: res.status, data });
    throw new Error(data.error || "Authentication failed");
  }

  localStorage.setItem("tevy_session_token", data.session_token);
  localStorage.setItem("tevy_user_id", data.user.id);
  localStorage.setItem("tevy_user_email", data.user.email);

  return data;
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tevy_session_token");
}

export async function getAccessToken(): Promise<string | null> {
  return getSessionToken();
}

export function isAuthenticated(): boolean {
  return !!getSessionToken();
}

export async function getUser() {
  const token = getSessionToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) signOut();
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function signOut() {
  const token = getSessionToken();

  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  localStorage.removeItem("tevy_session_token");
  localStorage.removeItem("tevy_user_id");
  localStorage.removeItem("tevy_user_email");
  localStorage.removeItem("tevy_instance_id");
  localStorage.removeItem("tevy_instance_name");
  localStorage.removeItem("tevy_webchat_url");
  localStorage.removeItem("tevy_business_name");
}
