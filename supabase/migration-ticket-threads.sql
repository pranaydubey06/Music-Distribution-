-- ============================================================================
-- Spilrix Distribution — Ticket conversation threading migration
-- Run ONCE in Supabase SQL Editor after all previous migrations.
-- ============================================================================

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
alter table public.ticket_messages enable row level security;

-- Migrate existing ticket messages to the new table
insert into public.ticket_messages (ticket_id, sender, message, created_at)
select t.id, 'artist', t.message, t.created_at
from public.tickets t
where t.message is not null and t.message <> ''
  and not exists (select 1 from public.ticket_messages m where m.ticket_id = t.id);

-- Drop old message column
alter table public.tickets drop column if exists message;

-- Add attachments bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "Public read access - attachments" on storage.objects;
create policy "Public read access - attachments"
  on storage.objects for select using (bucket_id = 'attachments');

drop policy if exists "Public upload - attachments" on storage.objects;
create policy "Public upload - attachments"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'attachments');

-- Update storage usage function
create or replace function public.get_storage_usage()
returns table (bucket_id text, total_bytes bigint, file_count bigint)
language sql security definer set search_path = public
as $$
  select bucket_id,
    coalesce(sum((metadata->>'size')::bigint), 0) as total_bytes,
    count(*) as file_count
  from storage.objects
  where bucket_id in ('profiles', 'songs', 'covers', 'attachments')
  group by bucket_id;
$$;

grant execute on function public.get_storage_usage() to service_role;
