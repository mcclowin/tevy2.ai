-- tevy2.ai — Hetzner VPS Schema (simplified per PRD)
-- This replaces the old Fly.io schema
-- Run in Supabase SQL editor

-- Accounts (was "users")
CREATE TABLE IF NOT EXISTS public.accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  stytch_user_id      TEXT UNIQUE,
  stripe_customer_id  TEXT,
  api_key_hash        TEXT,               -- For dev platform API key auth
  plan                TEXT DEFAULT 'starter',  -- starter | pro | business
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Agents (was "instances")
CREATE TABLE IF NOT EXISTS public.agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL,
  hetzner_server_id   TEXT,               -- Hetzner server ID
  hetzner_ip          TEXT,               -- Public IPv4
  gateway_token       TEXT,               -- Token for OpenClaw gateway auth
  state               TEXT DEFAULT 'provisioning',  -- provisioning | running | stopped | error | deleted
  business_name       TEXT,
  website_url         TEXT,
  config              JSONB DEFAULT '{}',  -- Full onboarding config (socials, competitors, etc.)
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_stytch ON public.accounts(stytch_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);
CREATE INDEX IF NOT EXISTS idx_agents_account ON public.agents(account_id);
CREATE INDEX IF NOT EXISTS idx_agents_state ON public.agents(state);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON public.agents(slug);

-- RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on accounts"
  ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agents"
  ON public.agents FOR ALL USING (true) WITH CHECK (true);
