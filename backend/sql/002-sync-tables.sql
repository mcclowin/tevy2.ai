-- tevy2.ai — Heartbeat Sync + Approval Tables
-- Run this in your Supabase SQL editor after schema.sql

-- Add config_version to instances (tracks when config was last changed from dashboard)
alter table public.instances add column if not exists config_version integer default 0;

-- Brand profiles (editable from dashboard, synced to bot)
create table if not exists public.brand_profiles (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid unique not null references public.instances(id) on delete cascade,
  content     text not null default '',
  updated_at  timestamptz default now()
);

-- Competitors (editable from dashboard, synced to bot)
create table if not exists public.competitors (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid unique not null references public.instances(id) on delete cascade,
  content     text not null default '',
  updated_at  timestamptz default now()
);

-- Tasks (created from dashboard, picked up by bot on heartbeat)
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references public.instances(id) on delete cascade,
  type          text not null,               -- draft_posts | research | seo_audit | custom
  brief         text not null,               -- human-readable description
  metadata      jsonb default '{}',          -- extra context (platform, count, topic, etc.)
  status        text default 'pending',      -- pending | in_progress | completed | failed
  picked_up_at  timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- Reports (bot sends results back to dashboard)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  type        text not null,               -- draft_posts | research | seo_audit | status_update
  results     jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- Approvals (draft posts awaiting owner approval)
create table if not exists public.approvals (
  id              uuid primary key default gen_random_uuid(),
  instance_id     uuid not null references public.instances(id) on delete cascade,
  task_id         uuid references public.tasks(id) on delete set null,
  platform        text not null,             -- instagram | linkedin | twitter | tiktok | facebook
  content         text not null,             -- the actual post text
  media_url       text,                      -- optional image/video URL
  scheduled_for   timestamptz,               -- when to publish
  status          text default 'pending_approval',  -- pending_approval | approved | rejected | published
  owner_notes     text,                      -- owner's feedback when editing/rejecting
  bot_notified    boolean default false,     -- has the bot been told about this decision?
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Heartbeat log (track bot check-ins for monitoring)
create table if not exists public.heartbeats (
  id              uuid primary key default gen_random_uuid(),
  instance_id     uuid not null references public.instances(id) on delete cascade,
  since_version   integer,
  current_version integer,
  changes_sent    integer default 0,
  tasks_sent      integer default 0,
  created_at      timestamptz default now()
);

-- Indexes
create index if not exists idx_tasks_instance on public.tasks(instance_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_reports_instance on public.reports(instance_id);
create index if not exists idx_approvals_instance on public.approvals(instance_id);
create index if not exists idx_approvals_status on public.approvals(status);
create index if not exists idx_heartbeats_instance on public.heartbeats(instance_id);
create index if not exists idx_heartbeats_created on public.heartbeats(created_at);

-- RLS
alter table public.brand_profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;
alter table public.approvals enable row level security;
alter table public.heartbeats enable row level security;

-- Service role full access
create policy "Service role full access on brand_profiles" on public.brand_profiles for all using (true) with check (true);
create policy "Service role full access on competitors" on public.competitors for all using (true) with check (true);
create policy "Service role full access on tasks" on public.tasks for all using (true) with check (true);
create policy "Service role full access on reports" on public.reports for all using (true) with check (true);
create policy "Service role full access on approvals" on public.approvals for all using (true) with check (true);
create policy "Service role full access on heartbeats" on public.heartbeats for all using (true) with check (true);
