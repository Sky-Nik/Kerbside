-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15.
create table public.fuel_fills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  odometer integer not null check (odometer >= 0),
  litres numeric(8,2) not null check (litres > 0),
  cost numeric(10,2) not null check (cost >= 0),
  expense_id uuid references public.expenses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.fuel_fills (user_id, date);
alter table public.fuel_fills enable row level security;
create policy "own rows" on public.fuel_fills for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Odometer photos for logbook shifts (paths in the private receipts bucket, <uid>/odometer/...)
alter table public.trips add column photos text[];
