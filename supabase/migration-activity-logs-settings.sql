-- ============================================================================
-- Spilrix Distribution — Activity logs + App settings migration
--
-- Run this ONCE in your EXISTING Supabase project's SQL Editor, after the
-- previous migrations. Creates activity_logs and app_settings tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- activity_logs
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid references public.artists (id) on delete set null,
  artist_name  text,
  action       text not null,
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists activity_logs_artist_id_idx on public.activity_logs (artist_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
alter table public.activity_logs enable row level security;

-- ----------------------------------------------------------------------------
-- app_settings
-- A single-row config table. The row is inserted once here and updated via
-- the admin panel. Using a fixed id makes upsert straightforward.
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                     text primary key default 'global',
  maintenance_mode       boolean not null default false,
  max_upload_mb          integer not null default 50,
  allowed_image_formats  text[] not null default array['jpg','jpeg','png','webp'],
  allowed_audio_formats  text[] not null default array['mp3','wav','flac','aac','ogg'],
  updated_at             timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Seed the one-and-only settings row (safe to re-run).
insert into public.app_settings (id)
values ('global')
on conflict (id) do nothing;
