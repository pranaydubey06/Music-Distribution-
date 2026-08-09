-- ============================================================================
-- Migration: Supabase Auth for artists
--
-- Run this in Supabase → SQL Editor on an EXISTING project.
-- (Fresh projects get all of this from schema.sql already.)
--
-- Links artist profiles to Supabase Auth users:
--   artists.user_id — the auth.users id this profile belongs to
--   artists.email   — copied at registration for the admin roster
--
-- Existing artist rows keep user_id NULL (they were created before auth);
-- those artists must register a new account.
--
-- ALSO REQUIRED (Supabase Dashboard, not SQL):
--   1. Authentication → Providers → Email → make sure "Confirm email" is ON.
--   2. Authentication → URL Configuration → set Site URL to your deployed
--      domain (e.g. https://yourdomain.com) and add it to Redirect URLs —
--      also add http://localhost:3000 for local testing.
-- ============================================================================

alter table public.artists
  add column if not exists user_id uuid unique references auth.users (id) on delete set null;

alter table public.artists
  add column if not exists email text;

create index if not exists artists_user_id_idx on public.artists (user_id);
