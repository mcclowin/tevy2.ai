-- tevy2.ai Supabase Schema
-- Run this in your Supabase SQL editor

-- Agent instances (1 per user for MVP)
-- user_id references Supabase Auth UUID
create table if not exists public.instances (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,            -- from auth.users
  user_email        text,
  fly_machine_id    text not null,
  fly_machine_name  text not null,
  status            text default 'provisioning',  -- provisioning | running | stopped | error | deleted
  region            text default 'lhr',
  plan              text default 'starter',       -- starter | pro
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

-- User profiles (optional, for extra data beyond auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id),
  name        text,
  plan        text default 'starter',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Indexes
create index if not exists idx_instances_user_id on public.instances(user_id);
create index if not exists idx_instances_status on public.instances(status);
create index if not exists idx_usage_logs_instance on public.usage_logs(instance_id);
create index if not exists idx_usage_logs_created on public.usage_logs(created_at);

-- RLS
alter table public.instances enable row level security;
alter table public.usage_logs enable row level security;
alter table public.profiles enable row level security;

-- Policies: service role has full access (backend uses service_role key)
-- Users can read their own data via API (backend enforces auth)
create policy "Service role full access on instances"
  on public.instances for all using (true) with check (true);

create policy "Service role full access on usage_logs"
  on public.usage_logs for all using (true) with check (true);

create policy "Service role full access on profiles"
  on public.profiles for all using (true) with check (true);

-- Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists to avoid duplicate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
