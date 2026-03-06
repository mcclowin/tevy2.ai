import { env } from "../env.js";

const FLY_API = "https://api.machines.dev/v1";

type FlyMachineConfig = {
  name: string;
  region: string;
  config: {
    image: string;
    env: Record<string, string>;
    services: Array<{
      ports: Array<{ port: number; handlers: string[] }>;
      protocol: string;
      internal_port: number;
    }>;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    auto_destroy: boolean;
    restart: { policy: string };
  };
};

type FlyMachine = {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  created_at: string;
  updated_at: string;
};

async function flyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${FLY_API}/apps/${env.FLY_APP_NAME}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.FLY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

export async function createMachine(opts: {
  name: string;
  envVars: Record<string, string>;
  region?: string;
}): Promise<FlyMachine> {
  const payload: FlyMachineConfig = {
    name: opts.name,
    region: opts.region || env.FLY_REGION,
    config: {
      image: env.AGENT_IMAGE,
      env: {
        ...opts.envVars,
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        MODEL: env.DEFAULT_MODEL,
      },
      services: [
        {
          ports: [
            { port: 443, handlers: ["tls", "http"] },
            { port: 80, handlers: ["http"] },
          ],
          protocol: "tcp",
          internal_port: 18789,
        },
      ],
      guest: {
        cpu_kind: "shared",
        cpus: 1,
        memory_mb: 512,
      },
      auto_destroy: false,
      restart: { policy: "on-failure" },
    },
  };

  const res = await flyFetch("/machines", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fly create machine failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<FlyMachine>;
}

export async function getMachine(machineId: string): Promise<FlyMachine> {
  const res = await flyFetch(`/machines/${machineId}`);
  if (!res.ok) throw new Error(`Fly get machine failed: ${res.status}`);
  return res.json() as Promise<FlyMachine>;
}

export async function startMachine(machineId: string): Promise<void> {
  const res = await flyFetch(`/machines/${machineId}/start`, { method: "POST" });
  if (!res.ok) throw new Error(`Fly start failed: ${res.status}`);
}

export async function stopMachine(machineId: string): Promise<void> {
  const res = await flyFetch(`/machines/${machineId}/stop`, { method: "POST" });
  if (!res.ok) throw new Error(`Fly stop failed: ${res.status}`);
}

export async function deleteMachine(machineId: string): Promise<void> {
  const res = await flyFetch(`/machines/${machineId}?force=true`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Fly delete failed: ${res.status}`);
}

export async function listMachines(): Promise<FlyMachine[]> {
  const res = await flyFetch("/machines");
  if (!res.ok) throw new Error(`Fly list machines failed: ${res.status}`);
  return res.json() as Promise<FlyMachine[]>;
}

// Update a machine's image (rolling update)
// Fly replaces the machine in-place: stop → update config → start
export async function updateMachine(
  machineId: string,
  opts: { image?: string; envVars?: Record<string, string> }
): Promise<FlyMachine> {
  // Get current config first
  const current = await getMachine(machineId);

  const res = await flyFetch(`/machines/${machineId}`, {
    method: "POST",
    body: JSON.stringify({
      config: {
        image: opts.image || env.AGENT_IMAGE,
        env: opts.envVars, // pass full env — Fly replaces, doesn't merge
        services: [
          {
            ports: [
              { port: 443, handlers: ["tls", "http"] },
              { port: 80, handlers: ["http"] },
            ],
            protocol: "tcp",
            internal_port: 18789,
          },
        ],
        guest: {
          cpu_kind: "shared",
          cpus: 1,
          memory_mb: 512,
        },
        auto_destroy: false,
        restart: { policy: "on-failure" },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fly update machine failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<FlyMachine>;
}
