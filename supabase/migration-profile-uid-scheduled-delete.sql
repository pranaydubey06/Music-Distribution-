-- ============================================================================
-- Spilrix Distribution — Profile/UID/Scheduled-Deletion migration
--
-- Run this ONCE in your EXISTING Supabase project's SQL Editor, after you've
-- already run migration-ep-album.sql. Safe to run on a database with real
-- data — every existing artist gets a sequential UID assigned automatically.
-- ============================================================================

-- 1. Sequential, human-friendly artist IDs (e.g. 10001, 10002, ...) — much
--    easier to read out over WhatsApp than a UUID.
create sequence if not exists public.artist_uid_seq start 10001;

alter table public.artists add column if not exists display_id integer;
alter table public.artists alter column display_id set default nextval('public.artist_uid_seq');

update public.artists
set display_id = nextval('public.artist_uid_seq')
where display_id is null;

alter table public.artists alter column display_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'artists_display_id_unique'
  ) then
    alter table public.artists add constraint artists_display_id_unique unique (display_id);
  end if;
end $$;

create index if not exists artists_display_id_idx on public.artists (display_id);

-- 2. Artist social links, shown on their profile panel.
alter table public.artists add column if not exists instagram_url text;
alter table public.artists add column if not exists youtube_url text;
alter table public.artists add column if not exists spotify_url text;

-- 3. Scheduled deletion on releases: instead of deleting immediately, the
--    admin sets a deadline + reason. A release past its deadline is
--    permanently removed (DB rows + Storage files) the next time anyone
--    loads /api/releases or /api/admin/releases — see
--    lib/process-scheduled-deletions.ts.
alter table public.releases add column if not exists scheduled_deletion_at timestamptz;
alter table public.releases add column if not exists deletion_reason text;

create index if not exists releases_scheduled_deletion_idx
  on public.releases (scheduled_deletion_at);
