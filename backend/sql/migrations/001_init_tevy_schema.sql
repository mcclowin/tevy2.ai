-- 001_init_tevy_schema.sql
-- Initial Tevy backend schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  stytch_user_id      TEXT UNIQUE,
  stripe_customer_id  TEXT,
  api_key_hash        TEXT,
  plan                TEXT DEFAULT 'starter',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL,
  hetzner_server_id   TEXT,
  hetzner_ip          TEXT,
  gateway_token       TEXT,
  state               TEXT DEFAULT 'provisioning',
  business_name       TEXT,
  website_url         TEXT,
  config              JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
);

CREATE INDEX IF NOT EXISTS idx_accounts_stytch ON public.accounts(stytch_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);
CREATE INDEX IF NOT EXISTS idx_agents_account ON public.agents(account_id);
CREATE INDEX IF NOT EXISTS idx_agents_state ON public.agents(state);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON public.agents(slug);
CREATE UNIQUE INDEX IF NOT EXISTS agents_account_id_slug_active ON public.agents (account_id, slug) WHERE state <> 'deleted';

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access on accounts"
    ON public.accounts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on agents"
    ON public.agents FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
