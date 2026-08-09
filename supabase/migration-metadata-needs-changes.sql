-- ============================================================================
-- Migration: release metadata + "Needs Changes" review status
--
-- Run this in Supabase → SQL Editor on an EXISTING project.
-- (Fresh projects get all of this from schema.sql already.)
--
-- Adds:
--   releases.language     — release language (e.g. "English", "Hindi")
--   releases.copyright    — copyright line (e.g. "© 2026 Artist Name")
--   releases.admin_note   — note from admin when requesting changes
--   tracks.lyrics         — optional lyrics per track
--   status 'Needs Changes' — admin can send a release back for edits
-- ============================================================================

alter table public.releases add column if not exists language text;
alter table public.releases add column if not exists copyright text;
alter table public.releases add column if not exists admin_note text;

alter table public.tracks add column if not exists lyrics text;

-- Allow the new status. The original check constraint was auto-named by
-- Postgres from the inline `check (...)` in schema.sql.
alter table public.releases drop constraint if exists releases_status_check;
alter table public.releases add constraint releases_status_check
  check (status in (
    'Draft', 'Pending Review', 'Needs Changes', 'Approved',
    'Sent to Platforms', 'Live', 'Rejected'
  ));
