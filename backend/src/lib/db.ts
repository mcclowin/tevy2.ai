import { Pool } from "pg";
import { env } from "../env.js";

const isRemote = env.DATABASE_URL.includes("supabase.co") || env.DATABASE_URL.includes("railway.app");
const connString = isRemote
  ? env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, "")
  : env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
