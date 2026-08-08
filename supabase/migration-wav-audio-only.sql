-- Lock artist release uploads to WAV audio only.
-- Safe to run on an existing database; existing files are not changed.

alter table public.app_settings
  alter column allowed_audio_formats set default array['wav'];

update public.app_settings
set allowed_audio_formats = array['wav'], updated_at = now()
where id = 'global';
