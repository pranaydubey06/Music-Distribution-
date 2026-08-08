-- Run once for existing Spilrix projects to support payment history.
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

create index if not exists payment_records_artist_idx
  on public.payment_records (artist_id, created_at desc);

create index if not exists payment_records_payment_id_idx
  on public.payment_records (payment_id);

alter table public.payment_records enable row level security;
-- Service role only accesses payment records for verification and listing
