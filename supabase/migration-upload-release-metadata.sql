-- ============================================================================
-- Migration: production upload-release metadata
--
-- Run this once in Supabase SQL Editor for an existing Spilrix database.
-- It preserves all existing releases and adds the fields collected by the
-- six-step upload workflow.
-- ============================================================================

alter table public.releases add column if not exists version text;
alter table public.releases add column if not exists original_release_date date;
alter table public.releases add column if not exists primary_genre text;
alter table public.releases add column if not exists secondary_genre text;
alter table public.releases add column if not exists record_label text;
alter table public.releases add column if not exists primary_artist_spotify_url text;
alter table public.releases add column if not exists featuring_artists text;
alter table public.releases add column if not exists featuring_artist_spotify_urls text;
alter table public.releases add column if not exists distribution_platforms text[] not null default array[]::text[];

alter table public.tracks add column if not exists version text;
alter table public.tracks add column if not exists duration integer;
alter table public.tracks add column if not exists instrumental boolean not null default false;
alter table public.tracks add column if not exists isrc text;
alter table public.tracks add column if not exists language text;
alter table public.tracks add column if not exists featuring_artists text;
alter table public.tracks add column if not exists composer text;
alter table public.tracks add column if not exists producer text;
