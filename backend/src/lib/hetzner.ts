/**
 * Hetzner Cloud API client for 1:1 VPS provisioning
 *
 * Each customer gets their own CX22 server (2 vCPU, 4GB RAM, 40GB NVMe).
 * Servers are created from a base snapshot + cloud-init for customization.
 */

import { env } from "../env.js";

const API = "https://api.hetzner.cloud/v1";

// ── Types ──────────────────────────────────────────────────────────────

export type HetznerServer = {
  id: number;
  name: string;
  status: "initializing" | "starting" | "running" | "stopping" | "off" | "deleting" | "migrating" | "rebuilding" | "unknown";
  public_net: {
    ipv4: { ip: string };
    ipv6: { ip: string };
  };
  server_type: { name: string; description: string };
  datacenter: { name: string; location: { name: string; city: string } };
  image: { id: number; name: string } | null;
  created: string;
  labels: Record<string, string>;
};

export type HetznerSSHKey = {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
};

export type HetznerAction = {
  id: number;
  status: "running" | "success" | "error";
  progress: number;
};

// ── HTTP helper ────────────────────────────────────────────────────────

async function hetznerFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.HETZNER_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hetzner API ${options.method || "GET"} ${path} failed (${res.status}): ${body}`);
  }

  // 204 No Content
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

// ── Servers ────────────────────────────────────────────────────────────

/**
 * Create a new VPS from the base snapshot with cloud-init user data.
 */
export async function createServer(opts: {
  name: string;
  cloudInit: string;
  labels?: Record<string, string>;
  serverType?: string;
  location?: string;
  sshKeyIds?: number[];
  snapshotId?: number;
}): Promise<{ server: HetznerServer; action: HetznerAction }> {
  const payload: Record<string, unknown> = {
    name: opts.name,
    server_type: opts.serverType || env.HETZNER_SERVER_TYPE,
    location: opts.location || env.HETZNER_LOCATION,
    start_after_create: true,
    user_data: opts.cloudInit,
    labels: {
      managed_by: "tevy2",
      ...opts.labels,
    },
  };

  // Use snapshot if available, otherwise fresh Ubuntu
  if (opts.snapshotId || env.HETZNER_SNAPSHOT_ID) {
    payload.image = opts.snapshotId || parseInt(env.HETZNER_SNAPSHOT_ID);
  } else {
    payload.image = "ubuntu-24.04";
  }

  // Attach SSH keys for management
  if (opts.sshKeyIds?.length) {
    payload.ssh_keys = opts.sshKeyIds;
  } else if (env.HETZNER_SSH_KEY_ID) {
    payload.ssh_keys = [parseInt(env.HETZNER_SSH_KEY_ID)];
  }

  // Attach to firewall if configured
  if (env.HETZNER_FIREWALL_ID) {
    payload.firewalls = [{ firewall: parseInt(env.HETZNER_FIREWALL_ID) }];
  }

  const result = await hetznerFetch<{ server: HetznerServer; action: HetznerAction }>(
    "/servers",
    { method: "POST", body: JSON.stringify(payload) }
  );

  return result;
}

/**
 * Get server details by ID.
 */
export async function getServer(serverId: number): Promise<HetznerServer> {
  const { server } = await hetznerFetch<{ server: HetznerServer }>(`/servers/${serverId}`);
  return server;
}

/**
 * List all servers with our label.
 */
export async function listServers(): Promise<HetznerServer[]> {
  const { servers } = await hetznerFetch<{ servers: HetznerServer[] }>(
    "/servers?label_selector=managed_by=tevy2&per_page=50"
  );
  return servers;
}

/**
 * Power on a server.
 */
export async function powerOn(serverId: number): Promise<HetznerAction> {
  const { action } = await hetznerFetch<{ action: HetznerAction }>(
    `/servers/${serverId}/actions/poweron`,
    { method: "POST" }
  );
  return action;
}

/**
 * Power off a server (hard shutdown).
 */
export async function powerOff(serverId: number): Promise<HetznerAction> {
  const { action } = await hetznerFetch<{ action: HetznerAction }>(
    `/servers/${serverId}/actions/poweroff`,
    { method: "POST" }
  );
  return action;
}

/**
 * Graceful shutdown.
 */
export async function shutdown(serverId: number): Promise<HetznerAction> {
  const { action } = await hetznerFetch<{ action: HetznerAction }>(
    `/servers/${serverId}/actions/shutdown`,
    { method: "POST" }
  );
  return action;
}

/**
 * Reboot a server.
 */
export async function reboot(serverId: number): Promise<HetznerAction> {
  const { action } = await hetznerFetch<{ action: HetznerAction }>(
    `/servers/${serverId}/actions/reboot`,
    { method: "POST" }
  );
  return action;
}

/**
 * Delete a server permanently.
 */
export async function deleteServer(serverId: number): Promise<void> {
  await hetznerFetch(`/servers/${serverId}`, { method: "DELETE" });
}

/**
 * Update server labels.
 */
export async function updateServer(
  serverId: number,
  opts: { name?: string; labels?: Record<string, string> }
): Promise<HetznerServer> {
  const { server } = await hetznerFetch<{ server: HetznerServer }>(
    `/servers/${serverId}`,
    { method: "PUT", body: JSON.stringify(opts) }
  );
  return server;
}

// ── Snapshots ──────────────────────────────────────────────────────────

/**
 * Create a snapshot from a server (for base image creation).
 */
export async function createSnapshot(
  serverId: number,
  description: string
): Promise<{ image: { id: number }; action: HetznerAction }> {
  return hetznerFetch(`/servers/${serverId}/actions/create_image`, {
    method: "POST",
    body: JSON.stringify({ description, type: "snapshot" }),
  });
}

/**
 * List snapshots.
 */
export async function listSnapshots(): Promise<Array<{ id: number; description: string; created: string }>> {
  const { images } = await hetznerFetch<{ images: Array<{ id: number; description: string; created: string }> }>(
    "/images?type=snapshot&sort=created:desc&per_page=25"
  );
  return images;
}

/**
 * Delete a snapshot.
 */
export async function deleteSnapshot(imageId: number): Promise<void> {
  await hetznerFetch(`/images/${imageId}`, { method: "DELETE" });
}

// ── SSH Keys ───────────────────────────────────────────────────────────

/**
 * Upload an SSH public key to Hetzner.
 */
export async function createSSHKey(name: string, publicKey: string): Promise<HetznerSSHKey> {
  const { ssh_key } = await hetznerFetch<{ ssh_key: HetznerSSHKey }>("/ssh_keys", {
    method: "POST",
    body: JSON.stringify({ name, public_key: publicKey }),
  });
  return ssh_key;
}

/**
 * List SSH keys.
 */
export async function listSSHKeys(): Promise<HetznerSSHKey[]> {
  const { ssh_keys } = await hetznerFetch<{ ssh_keys: HetznerSSHKey[] }>("/ssh_keys");
  return ssh_keys;
}

// ── Firewalls ──────────────────────────────────────────────────────────

/**
 * Create a firewall for agent VPSes.
 * SSH only from our backend IP, gateway port only from load balancer.
 */
export async function createFirewall(opts: {
  name: string;
  backendIp?: string;
  lbIp?: string;
}): Promise<{ id: number }> {
  const rules = [
    // SSH from backend only
    {
      direction: "in",
      protocol: "tcp",
      port: "22",
      source_ips: opts.backendIp ? [`${opts.backendIp}/32`] : ["0.0.0.0/0", "::/0"],
      description: "SSH from backend",
    },
    // OpenClaw gateway from load balancer (or anywhere if no LB yet)
    {
      direction: "in",
      protocol: "tcp",
      port: "18789",
      source_ips: opts.lbIp ? [`${opts.lbIp}/32`] : ["0.0.0.0/0", "::/0"],
      description: "OpenClaw gateway",
    },
    // ICMP for health checks
    {
      direction: "in",
      protocol: "icmp",
      source_ips: ["0.0.0.0/0", "::/0"],
      description: "ICMP ping",
    },
  ];

  const { firewall } = await hetznerFetch<{ firewall: { id: number } }>("/firewalls", {
    method: "POST",
    body: JSON.stringify({ name, rules, labels: { managed_by: "tevy2" } }),
  });

  return firewall;
}

// ── Actions ────────────────────────────────────────────────────────────

/**
 * Poll an action until it completes.
 */
export async function waitForAction(
  actionId: number,
  timeoutMs = 120_000,
  pollMs = 3000
): Promise<HetznerAction> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { action } = await hetznerFetch<{ action: HetznerAction }>(`/actions/${actionId}`);

    if (action.status === "success") return action;
    if (action.status === "error") throw new Error(`Hetzner action ${actionId} failed`);

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(`Hetzner action ${actionId} timed out after ${timeoutMs}ms`);
}
