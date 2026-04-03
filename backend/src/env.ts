import "dotenv/config";

// Typed env config — fails fast if missing
function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  PORT: parseInt(optional("PORT", "3001")),
  DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === "true",

  // Stytch (dashboard user auth)
  STYTCH_PROJECT_ID: optional("STYTCH_PROJECT_ID", ""),
  STYTCH_SECRET: optional("STYTCH_SECRET", ""),

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // BotBoot (app/platform auth)
  BOTBOOT_API_URL: optional("BOTBOOT_API_URL", "http://localhost:3001"),
  BOTBOOT_API_KEY: required("BOTBOOT_API_KEY"),

  // Branding / URLs
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:3000"),
  BACKEND_PUBLIC_URL: optional("BACKEND_PUBLIC_URL", "http://localhost:3002"),
  HETZNER_AGENT_DOMAIN: optional("HETZNER_AGENT_DOMAIN", "agents.tevy2.ai"),
  DEFAULT_MODEL: optional("DEFAULT_MODEL", "openai-codex/gpt-5.4"),
};
