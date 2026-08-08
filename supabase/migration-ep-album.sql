-- ============================================================================
-- Spilrix Distribution — EP/Album migration
--
-- Run this ONCE in your EXISTING Supabase project's SQL Editor to upgrade
-- from the old "one row per song" releases table to the new
-- Release (Single/EP/Album) + Track structure. Safe to run on a database
-- that already has real submissions — every existing release becomes a
-- "Single" with its one song carried over into the new `tracks` table.
--
-- Do NOT run supabase/schema.sql on top of this project — that file is for
-- brand-new projects only and assumes the new structure already exists.
-- ============================================================================

-- 1. Create the new tracks table.
create table if not exists public.tracks (
  id            uuid primary key default gen_random_uuid(),
  release_id    uuid not null references public.releases (id) on delete cascade,
  track_number  int not null default 1,
  song_title    text not null,
  genre         text,
  audio_url     text not null,
  explicit      boolean not null default false,
  songwriter    text,
  created_at    timestamptz not null default now()
);

create index if not exists tracks_release_id_idx on public.tracks (release_id);
alter table public.tracks enable row level security;

-- 2. Add the new release-level columns (all nullable for now — backfilled below).
alter table public.releases add column if not exists title text;
alter table public.releases add column if not exists release_type text;
alter table public.releases add column if not exists cover_art_url text;
alter table public.releases add column if not exists rejection_reason text;
alter table public.releases add column if not exists spotify_url text;
alter table public.releases add column if not exists apple_music_url text;
alter table public.releases add column if not exists youtube_url text;

-- 3. Backfill title/release_type from the old song_title column.
--    Every existing release becomes a Single (it only ever had one song).
update public.releases
set title = song_title, release_type = 'Single'
where title is null and song_title is not null;

-- 4. Copy each existing release's song into the new tracks table.
--    Guarded so this is safe to re-run without creating duplicates.
insert into public.tracks (release_id, track_number, song_title, genre, audio_url)
select id, 1, song_title, genre, audio_url
from public.releases
where song_title is not null
  and not exists (select 1 from public.tracks where tracks.release_id = releases.id);

-- 5. Now that every row has a title/release_type, make them required.
alter table public.releases alter column title set not null;
alter table public.releases alter column release_type set not null;
alter table public.releases alter column release_type set default 'Single';
alter table public.releases add constraint releases_release_type_check
  check (release_type in ('Single', 'EP', 'Album'));

-- 6. Replace the old 3-value status constraint with the expanded lifecycle.
--    (Existing 'Pending Review' / 'Approved' / 'Rejected' rows are still
--    valid under the new constraint — only the allowed set grows.)
alter table public.releases drop constraint if exists releases_status_check;
alter table public.releases add constraint releases_status_check
  check (status in (
    'Pending Review', 'Approved', 'Sent to Platforms', 'Live', 'Rejected'
  ));

-- 7. Drop the old per-song columns now that they live in `tracks`.
alter table public.releases drop column if exists song_title;
alter table public.releases drop column if exists genre;
alter table public.releases drop column if exists audio_url;

-- 8. Add the new 'covers' storage bucket + its policies.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "Public read access - covers" on storage.objects;
create policy "Public read access - covers"
  on storage.objects for select
  using (bucket_id = 'covers');

drop policy if exists "Public upload - covers" on storage.objects;
create policy "Public upload - covers"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'covers');

-- 9. Update the storage usage function to include the new bucket.
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
  where bucket_id in ('profiles', 'songs', 'covers')
  group by bucket_id;
$$;

grant execute on function public.get_storage_usage() to service_role;

-- Done. Verify in Table Editor: `releases` should now have title/
-- release_type/cover_art_url columns (no more song_title/genre/audio_url),
-- and a new `tracks` table should have one row per existing release.
