-- Run once for existing Spilrix projects after the previous migrations.
create table if not exists public.artist_access (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid not null references public.artists (id) on delete cascade,
  upload_access    boolean not null default false,
  plan_name        text check (plan_name in ('Single Release', '1 Month Unlimited', '6 Months Unlimited', '1 Year Unlimited', 'Custom')),
  custom_plan_name text,
  start_date       date,
  expiry_date      date,
  status           text not null default 'Locked' check (status in ('Locked', 'Unlocked', 'Expired')),
  admin_notes      text,
  updated_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists artist_access_artist_created_idx
  on public.artist_access (artist_id, created_at desc);

alter table public.artist_access enable row level security;
-- No policies: only the server's service role may read/write this audit trail.
