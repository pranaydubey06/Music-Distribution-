-- ============================================================================
-- Spilrix Distribution — Draft status migration
--
-- Run this ONCE in your EXISTING Supabase project's SQL Editor, after the
-- two previous migrations. Adds 'Draft' as a valid release status — no data
-- changes, just widens the allowed status values.
-- ============================================================================

alter table public.releases drop constraint if exists releases_status_check;
alter table public.releases add constraint releases_status_check
  check (status in (
    'Draft', 'Pending Review', 'Approved', 'Sent to Platforms', 'Live', 'Rejected'
  ));
