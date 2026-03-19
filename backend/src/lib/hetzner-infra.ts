/**
 * Hetzner infra adapter — matches the interface used by instances.ts
 *
 * This bridges between the generic infra interface (createMachine, etc.)
 * and the Hetzner-specific API calls + cloud-init provisioning.
 */

import * as hetzner from "./hetzner.js";
import * as cloudInit from "./cloud-init.js";
import * as ssh from "./ssh.js";
import { env } from "../env.js";

export type HetznerMachine = {
  id: string;           // Hetzner server ID (as string for compat)
  name: string;
  state: string;        // running | off | initializing | starting | stopping
  ip: string;           // Public IPv4
  region: string;       // Datacenter location
  created_at: string;
};

/**
 * Create a new agent VPS.
 */
export async function createMachine(opts: {
  name: string;
  envVars: Record<string, string>;
  customerConfig: cloudInit.CustomerConfig;
}): Promise<HetznerMachine> {
  const script = cloudInit.buildProvisionScript(opts.customerConfig);

  const { server } = await hetzner.createServer({
    name: opts.name,
    cloudInit: script,
    labels: {
      slug: opts.customerConfig.slug,
      business: opts.customerConfig.businessName.slice(0, 63),
    },
  });

  return {
    id: String(server.id),
    name: server.name,
    state: server.status,
    ip: server.public_net.ipv4.ip,
    region: server.datacenter?.location?.name || env.HETZNER_LOCATION,
    created_at: server.created,
  };
}

/**
 * Get machine status.
 */
export async function getMachine(serverId: string): Promise<HetznerMachine> {
  const server = await hetzner.getServer(parseInt(serverId));
  return {
    id: String(server.id),
    name: server.name,
    state: server.status,
    ip: server.public_net.ipv4.ip,
    region: server.datacenter?.location?.name || "",
    created_at: server.created,
  };
}

/**
 * Start (power on) a machine.
 */
export async function startMachine(serverId: string): Promise<void> {
  const action = await hetzner.powerOn(parseInt(serverId));
  await hetzner.waitForAction(action.id);
}

/**
 * Stop (shutdown) a machine.
 */
export async function stopMachine(serverId: string): Promise<void> {
  const action = await hetzner.shutdown(parseInt(serverId));
  await hetzner.waitForAction(action.id, 60_000);
}

/**
 * Delete a machine.
 */
export async function deleteMachine(serverId: string): Promise<void> {
  await hetzner.deleteServer(parseInt(serverId));
}

/**
 * List all managed machines.
 */
export async function listMachines(): Promise<HetznerMachine[]> {
  const servers = await hetzner.listServers();
  return servers.map((s) => ({
    id: String(s.id),
    name: s.name,
    state: s.status,
    ip: s.public_net.ipv4.ip,
    region: s.datacenter?.location?.name || "",
    created_at: s.created,
  }));
}

/**
 * Execute a command on the machine via SSH.
 */
export async function execInMachine(serverId: string, cmd: string[]): Promise<string> {
  const server = await hetzner.getServer(parseInt(serverId));
  const ip = server.public_net.ipv4.ip;
  const result = await ssh.exec(ip, cmd.join(" "));
  return result.stdout;
}

/**
 * Read a file from the agent workspace.
 */
export async function readFileFromMachine(serverId: string, path: string): Promise<string> {
  const server = await hetzner.getServer(parseInt(serverId));
  return ssh.readFile(server.public_net.ipv4.ip, path);
}

/**
 * Write a file to the agent workspace.
 */
export async function writeFileToMachine(serverId: string, path: string, content: string): Promise<void> {
  const server = await hetzner.getServer(parseInt(serverId));
  await ssh.writeFile(server.public_net.ipv4.ip, path, content);
}

/**
 * No-ops for interface compat.
 */
export async function updateMachine(): Promise<HetznerMachine> {
  throw new Error("Use SSH + update.sh to update Hetzner VPSes");
}

export async function deleteVolume(): Promise<void> {
  // No volumes in Hetzner 1:1 model — storage is on the VPS itself
}

/**
 * Generate the webchat URL for a Hetzner machine.
 */
export function getWebchatUrl(slug: string): string {
  return `https://${slug}.${env.HETZNER_AGENT_DOMAIN}`;
}
