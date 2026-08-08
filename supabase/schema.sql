-- ============================================================================
-- Spilrix Distribution — Supabase schema
-- Run this whole file once in Supabase → SQL Editor for a FRESH project.
--
-- If you already have a Spilrix project running an older shape, do NOT run
-- this file — run the migration scripts in order instead:
--   1. supabase/migration-ep-album.sql
--   2. supabase/migration-profile-uid-scheduled-delete.sql
--   3. supabase/migration-auth.sql
--   4. supabase/migration-activity-logs-settings.sql
--   5. supabase/migration-upload-release-metadata.sql
--   6. supabase/migration-ticket-threads.sql
--   7. supabase/migration-wav-audio-only.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- artists
-- ----------------------------------------------------------------------------
create sequence if not exists public.artist_uid_seq start 10001;

create table if not exists public.artists (
  id              uuid primary key default gen_random_uuid(),
  -- A short, human-friendly ID (e.g. 10001) — much easier to read out over
  -- WhatsApp/phone than a UUID. Shown on the artist's profile panel and
  -- searchable in the admin roster.
  display_id      integer not null default nextval('public.artist_uid_seq') unique,
  -- Supabase Auth link. NULL only for legacy rows created before auth existed.
  user_id         uuid unique references auth.users (id) on delete set null,
  email           text,
  name            text not null,
  photo_url       text,
  instagram_url   text,
  youtube_url     text,
  spotify_url     text,
  created_at      timestamptz not null default now()
);

create index if not exists artists_name_idx on public.artists (name);
create index if not exists artists_display_id_idx on public.artists (display_id);
create index if not exists artists_user_id_idx on public.artists (user_id);

-- ----------------------------------------------------------------------------
-- artist_access (append-only history; newest row is the current access state)
-- ----------------------------------------------------------------------------
create table if not exists public.artist_access (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  upload_access boolean not null default false,
  plan_name text check (plan_name in ('Single Release', '1 Month Unlimited', '6 Months Unlimited', '1 Year Unlimited', 'Custom')),
  custom_plan_name text,
  start_date date,
  expiry_date date,
  status text not null default 'Locked' check (status in ('Locked', 'Unlocked', 'Expired')),
  admin_notes text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists artist_access_artist_created_idx on public.artist_access (artist_id, created_at desc);

-- ----------------------------------------------------------------------------
-- payment_records
-- ----------------------------------------------------------------------------
create table if not exists public.payment_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,
  artist_id      uuid not null references public.artists (id) on delete cascade,
  plan_name      text not null check (plan_name in ('Single Release', '1 Month Unlimited', '6 Months Unlimited', '1 Year Unlimited', 'Custom')),
  amount         numeric not null,
  payment_id     text not null unique,
  payment_status text not null default 'Completed',
  purchase_date  timestamptz not null default now(),
  start_date     date not null,
  expiry_date    date,
  created_at     timestamptz not null default now()
);
create index if not exists payment_records_artist_idx on public.payment_records (artist_id, created_at desc);
create index if not exists payment_records_payment_id_idx on public.payment_records (payment_id);

-- ----------------------------------------------------------------------------
-- releases
--
-- A release is the "project" — a Single, EP, or Album. Its actual songs
-- live in the `tracks` table below (a Single just happens to have exactly
-- one track). Status lives at the release level: a whole EP/Album moves
-- through review and distribution together, not track-by-track.
-- ----------------------------------------------------------------------------
create table if not exists public.releases (
  id                     uuid primary key default gen_random_uuid(),
  artist_id              uuid not null references public.artists (id) on delete cascade,
  artist_name            text not null,
  title                  text not null,
  version                text,
  release_type           text not null default 'Single'
                           check (release_type in ('Single', 'EP', 'Album')),
  cover_art_url          text,
  release_date           date,
  original_release_date  date,
  primary_genre          text,
  secondary_genre        text,
  language               text,
  record_label           text,
  primary_artist_spotify_url text,
  featuring_artists      text,
  featuring_artist_spotify_urls text,
  distribution_platforms text[] not null default array[]::text[],
  copyright              text,
  status                 text not null default 'Pending Review'
                           check (status in (
                             'Draft', 'Pending Review', 'Needs Changes', 'Approved',
                             'Sent to Platforms', 'Live', 'Rejected'
                           )),
  rejection_reason       text,
  -- Set when the admin sends the release back with "Needs Changes".
  admin_note             text,
  spotify_url            text,
  apple_music_url        text,
  youtube_url            text,
  -- When set (and in the past), this release gets permanently deleted the
  -- next time anyone loads /api/releases or /api/admin/releases — see
  -- lib/process-scheduled-deletions.ts. Lets admins give a grace period
  -- with a reason instead of deleting instantly.
  scheduled_deletion_at  timestamptz,
  deletion_reason        text,
  created_at             timestamptz not null default now()
);

create index if not exists releases_artist_id_idx on public.releases (artist_id);
create index if not exists releases_status_idx on public.releases (status);
create index if not exists releases_release_date_idx on public.releases (release_date);
create index if not exists releases_scheduled_deletion_idx on public.releases (scheduled_deletion_at);

-- ----------------------------------------------------------------------------
-- tracks
--
-- One row per song within a release. A Single has exactly one of these;
-- an EP/Album has several, ordered by track_number.
-- ----------------------------------------------------------------------------
create table if not exists public.tracks (
  id            uuid primary key default gen_random_uuid(),
  release_id    uuid not null references public.releases (id) on delete cascade,
  track_number  int not null default 1,
  song_title    text not null,
  version       text,
  genre         text,
  audio_url     text not null,
  duration      integer,
  explicit      boolean not null default false,
  instrumental  boolean not null default false,
  isrc          text,
  language      text,
  featuring_artists text,
  songwriter    text,
  composer      text,
  producer      text,
  lyrics        text,
  created_at    timestamptz not null default now()
);

create index if not exists tracks_release_id_idx on public.tracks (release_id);

-- ----------------------------------------------------------------------------
-- tickets
-- ----------------------------------------------------------------------------
create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists (id) on delete cascade,
  artist_name   text not null,
  subject       text not null,
  status        text not null default 'Open'
                  check (status in ('Open', 'Closed')),
  created_at    timestamptz not null default now()
);

create index if not exists tickets_artist_id_idx on public.tickets (artist_id);

create table if not exists public.ticket_messages (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid not null references public.tickets (id) on delete cascade,
  sender           text not null check (sender in ('artist', 'admin')),
  message          text not null,
  attachment_url   text,
  attachment_name  text,
  created_at       timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id);

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

-- ----------------------------------------------------------------------------
-- app_settings (single-row config)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                     text primary key default 'global',
  maintenance_mode       boolean not null default false,
  max_upload_mb          integer not null default 50,
  allowed_image_formats  text[] not null default array['jpg','jpeg','png','webp'],
  allowed_audio_formats  text[] not null default array['wav'],
  updated_at             timestamptz not null default now()
);

insert into public.app_settings (id)
values ('global')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- The Next.js app never talks to these tables with the anon key — every read
-- and write goes through a Route Handler under /app/api/**, which uses the
-- SERVICE ROLE key (and, for /api/admin/**, a server-side passcode check).
-- The service role bypasses RLS entirely, so the correct policy for the anon
-- and authenticated roles here is simply: no access at all.
-- ----------------------------------------------------------------------------
alter table public.artists       enable row level security;
alter table public.artist_access enable row level security;
alter table public.payment_records enable row level security;
alter table public.releases      enable row level security;
alter table public.tracks        enable row level security;
alter table public.tickets       enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_settings  enable row level security;

-- (No policies are created for anon/authenticated — RLS with zero policies
-- means every request from those roles is denied by default. Only the
-- service role, used server-side, can read or write these tables.)

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true), ('songs', 'songs', true), ('covers', 'covers', true), ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Public read so profile photos, cover art, and audio previews can be played
-- directly from their public URL.
drop policy if exists "Public read access - profiles" on storage.objects;
create policy "Public read access - profiles"
  on storage.objects for select
  using (bucket_id = 'profiles');

drop policy if exists "Public read access - songs" on storage.objects;
create policy "Public read access - songs"
  on storage.objects for select
  using (bucket_id = 'songs');

drop policy if exists "Public read access - covers" on storage.objects;
create policy "Public read access - covers"
  on storage.objects for select
  using (bucket_id = 'covers');

-- Anyone can upload into these buckets (this is the "no password" trade-off
-- described in the README), but nobody can overwrite or delete existing
-- files — there are intentionally no update/delete policies below.
drop policy if exists "Public upload - profiles" on storage.objects;
create policy "Public upload - profiles"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'profiles');

drop policy if exists "Public upload - songs" on storage.objects;
create policy "Public upload - songs"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'songs');

drop policy if exists "Public upload - covers" on storage.objects;
create policy "Public upload - covers"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'covers');

drop policy if exists "Public read access - attachments" on storage.objects;
create policy "Public read access - attachments"
  on storage.objects for select using (bucket_id = 'attachments');

drop policy if exists "Public upload - attachments" on storage.objects;
create policy "Public upload - attachments"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'attachments');

-- ============================================================================
-- Storage usage (for the admin control room's storage meter)
--
-- The `storage` schema isn't exposed through the normal REST API, so the
-- app can't just query storage.objects directly. This function lives in
-- `public` (which is exposed) and reads storage.objects internally — SQL
-- functions can always see other schemas regardless of REST API exposure.
-- ============================================================================
create or replace function public.get_storage_usage()
returns table (bucket_id text, total_bytes bigint, file_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    bucket_id,
    coalesce(sum((metadata->>'size')::bigint), 0) as total_bytes,
    count(*) as file_count
  from storage.objects
  where bucket_id in ('profiles', 'songs', 'covers', 'attachments')
  group by bucket_id;
$$;

grant execute on function public.get_storage_usage() to service_role;
