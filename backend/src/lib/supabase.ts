import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

// Service role client — full access, used server-side only
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Anon client — for user-scoped operations with RLS
export function createUserClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
