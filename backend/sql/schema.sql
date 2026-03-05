-- tevy2.ai Supabase Schema
-- Run this in your Supabase SQL editor

-- Users table (synced from Stytch)
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  stytch_user_id  text unique not null,
  email           text not null,
  name            text,
  plan            text default 'starter',  -- starter | pro
  last_login      timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Agent instances (1 per user for MVP)
create table if not exists public.instances (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,          -- stytch user_id
  user_email        text,
  fly_machine_id    text not null,
  fly_machine_name  text not null,
  status            text default 'provisioning',  -- provisioning | running | stopped | error | deleted
  region            text default 'lhr',
  plan              text default 'starter',
  chat_channel      text default 'webchat',       -- webchat | telegram
  business_name     text,
  website_url       text,
  config            jsonb default '{}',            -- full onboarding config
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Usage logs for billing
create table if not exists public.usage_logs (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid references public.instances(id),
  event       text not null,  -- created | start | stop | deleted | message | research
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- Indexes
create index if not exists idx_instances_user_id on public.instances(user_id);
create index if not exists idx_instances_status on public.instances(status);
create index if not exists idx_usage_logs_instance on public.usage_logs(instance_id);
create index if not exists idx_usage_logs_created on public.usage_logs(created_at);

-- RLS policies (optional — we use service role key for backend, but good practice)
alter table public.users enable row level security;
alter table public.instances enable row level security;
alter table public.usage_logs enable row level security;

-- Service role can do everything (our backend uses service role key)
create policy "Service role full access on users"
  on public.users for all
  using (true)
  with check (true);

create policy "Service role full access on instances"
  on public.instances for all
  using (true)
  with check (true);

create policy "Service role full access on usage_logs"
  on public.usage_logs for all
  using (true)
  with check (true);
