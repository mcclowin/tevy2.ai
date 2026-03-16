/**
 * Infrastructure provider abstraction
 *
 * Routes to Fly.io or Docker host for legacy code (instances.ts).
 * Hetzner provider is used directly by agents.ts — not through this abstraction.
 */

import { env } from "../env.js";
import * as fly from "./fly.js";
import * as docker from "./docker-host.js";

// Legacy providers only — hetzner uses its own route (agents.ts)
const provider = env.INFRA_PROVIDER === "fly" ? fly : docker;

export const createMachine = provider.createMachine;
export const getMachine = provider.getMachine;
export const startMachine = provider.startMachine;
export const stopMachine = provider.stopMachine;
export const deleteMachine = provider.deleteMachine;
export const execInMachine = provider.execInMachine;
export const listMachines = provider.listMachines;
export const updateMachine = provider.updateMachine;
export const deleteVolume = provider.deleteVolume;
