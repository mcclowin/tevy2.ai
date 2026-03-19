/**
 * SSH utility for managing agent VPSes
 *
 * Uses the system ssh binary via child_process.
 * SSH key must be pre-configured at HETZNER_SSH_KEY_PATH.
 */

import { execFile } from "node:child_process";
import { env } from "../env.js";

const SSH_USER = "agent";
const SSH_OPTS = [
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "UserKnownHostsFile=/dev/null",
  "-o", "ConnectTimeout=10",
  "-o", "BatchMode=yes",
  "-o", "LogLevel=ERROR",
];

function sshArgs(ip: string, user?: string): string[] {
  const args = [...SSH_OPTS];
  if (env.HETZNER_SSH_KEY_PATH) {
    args.push("-i", env.HETZNER_SSH_KEY_PATH);
  }
  args.push(`${user || SSH_USER}@${ip}`);
  return args;
}

/**
 * Execute a command on a remote VPS via SSH.
 */
export async function exec(
  ip: string,
  command: string,
  opts?: { user?: string; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const args = [...sshArgs(ip, opts?.user), command];
    const timeout = opts?.timeoutMs || 30_000;

    const proc = execFile("ssh", args, {
      timeout,
      maxBuffer: 1024 * 1024, // 1MB
    }, (error, stdout, stderr) => {
      if (error && (error as any).killed) {
        reject(new Error(`SSH command timed out after ${timeout}ms`));
        return;
      }
      resolve({
        stdout: stdout?.toString() || "",
        stderr: stderr?.toString() || "",
        exitCode: error ? (error as any).code || 1 : 0,
      });
    });
  });
}

/**
 * Read a file from the agent's workspace.
 */
export async function readFile(ip: string, path: string): Promise<string> {
  // Sanitize path — must be relative, no traversal
  if (path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid file path");
  }
  const fullPath = `/home/agent/.openclaw/workspace/${path}`;
  const result = await exec(ip, `cat ${JSON.stringify(fullPath)}`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read ${path}: ${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Write a file to the agent's workspace.
 */
export async function writeFile(ip: string, path: string, content: string): Promise<void> {
  return writeFileEncoded(ip, path, content, "utf8");
}

/**
 * Write a file to the agent's workspace using utf8 text or base64 bytes.
 */
export async function writeFileEncoded(
  ip: string,
  path: string,
  content: string,
  encoding: "utf8" | "base64" = "utf8"
): Promise<void> {
  if (path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid file path");
  }
  const fullPath = `/home/agent/.openclaw/workspace/${path}`;
  // Ensure parent directory exists
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  const b64 = encoding === "base64" ? content : Buffer.from(content).toString("base64");
  const cmd = `mkdir -p ${JSON.stringify(dir)} && echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(fullPath)}`;
  const result = await exec(ip, cmd);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to write ${path}: ${result.stderr}`);
  }
}

/**
 * List files in a directory.
 */
export async function listFiles(ip: string, dir: string): Promise<string[]> {
  if (dir.includes("..")) throw new Error("Invalid path");
  const fullPath = dir.startsWith("/") ? dir : `/home/agent/.openclaw/workspace/${dir}`;
  const result = await exec(ip, `ls -1 ${JSON.stringify(fullPath)} 2>/dev/null || echo ""`);
  return result.stdout.split("\n").filter(Boolean);
}

/**
 * Restart the OpenClaw gateway service.
 */
export async function restartGateway(ip: string): Promise<void> {
  // Use root for systemctl
  const result = await exec(ip, "sudo systemctl restart openclaw-gateway", { user: "agent" });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to restart gateway: ${result.stderr}`);
  }
}

/**
 * Get gateway status.
 */
export async function gatewayStatus(ip: string): Promise<"active" | "inactive" | "failed" | "unknown"> {
  const result = await exec(ip, "systemctl is-active openclaw-gateway 2>/dev/null || echo unknown");
  const status = result.stdout.trim();
  if (["active", "inactive", "failed"].includes(status)) return status as any;
  return "unknown";
}

/**
 * Read recent gateway logs.
 */
export async function gatewayLogs(ip: string, lines = 50): Promise<string> {
  const result = await exec(ip, `sudo journalctl -u openclaw-gateway --no-pager -n ${lines} 2>/dev/null || echo "no logs"`, { user: "agent" });
  return result.stdout;
}

/**
 * Run the update script (git pull + openclaw update + restart).
 */
export async function runUpdate(ip: string): Promise<string> {
  const result = await exec(ip, "sudo bash /opt/tevy/update.sh", { user: "agent", timeoutMs: 300_000 });
  return result.stdout + result.stderr;
}

/**
 * Create a backup tarball of the agent workspace.
 */
export async function backup(ip: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `/tmp/backup-${timestamp}.tar.gz`;
  const result = await exec(
    ip,
    `tar czf ${backupPath} -C /home/agent .openclaw/ 2>/dev/null && echo ${backupPath}`,
    { timeoutMs: 60_000 }
  );
  if (result.exitCode !== 0) {
    throw new Error(`Backup failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/**
 * Check if the VPS is reachable via SSH.
 */
export async function ping(ip: string): Promise<boolean> {
  try {
    const result = await exec(ip, "echo ok", { timeoutMs: 10_000 });
    return result.stdout.trim() === "ok";
  } catch {
    return false;
  }
}

/**
 * Install a ClawHub skill on the agent.
 */
export async function installSkill(ip: string, skillName: string): Promise<string> {
  const result = await exec(ip, `clawhub install ${JSON.stringify(skillName)}`);
  return result.stdout + result.stderr;
}

/**
 * Get OpenClaw version running on the VPS.
 */
export async function getOpenClawVersion(ip: string): Promise<string> {
  const result = await exec(ip, "openclaw --version 2>/dev/null || echo unknown");
  return result.stdout.trim();
}

/**
 * Get the current tevy image repo revision on the VPS.
 */
export async function getImageRevision(ip: string): Promise<string> {
  const result = await exec(ip, "git -C /opt/tevy rev-parse --short HEAD 2>/dev/null || echo unknown");
  return result.stdout.trim();
}

/**
 * Check whether the update script exists on the VPS.
 */
export async function hasUpdateScript(ip: string): Promise<boolean> {
  const result = await exec(ip, "[ -f /opt/tevy/update.sh ] && echo yes || echo no");
  return result.stdout.trim() === "yes";
}
