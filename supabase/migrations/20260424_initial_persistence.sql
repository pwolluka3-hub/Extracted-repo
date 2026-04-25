create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  name text not null default 'Personal Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null unique,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drafts (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null,
  name text not null,
  versions jsonb not null default '[]'::jsonb,
  current_version integer not null default 1,
  status text not null default 'draft',
  platforms jsonb not null default '[]'::jsonb,
  content_type text null,
  scheduled_at timestamptz null,
  published_at timestamptz null,
  publish_results jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drafts_user_id_updated_idx on drafts(user_id, updated_at desc);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null unique,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null unique,
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_state (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null unique,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspaces_set_updated_at on workspaces;
create trigger workspaces_set_updated_at before update on workspaces
for each row execute function set_updated_at();

drop trigger if exists brand_kits_set_updated_at on brand_kits;
create trigger brand_kits_set_updated_at before update on brand_kits
for each row execute function set_updated_at();

drop trigger if exists drafts_set_updated_at on drafts;
create trigger drafts_set_updated_at before update on drafts
for each row execute function set_updated_at();

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at before update on app_settings
for each row execute function set_updated_at();

drop trigger if exists chat_threads_set_updated_at on chat_threads;
create trigger chat_threads_set_updated_at before update on chat_threads
for each row execute function set_updated_at();

drop trigger if exists user_state_set_updated_at on user_state;
create trigger user_state_set_updated_at before update on user_state
for each row execute function set_updated_at();
