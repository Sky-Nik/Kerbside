-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15. Extra cars; trips/expenses with vehicle_id null belong to the main car.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  rego text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  effective_life numeric(4,1) not null default 8 check (effective_life > 0),
  created_at timestamptz not null default now()
);
create index on public.vehicles (user_id);
alter table public.vehicles enable row level security;
create policy "own rows" on public.vehicles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter table public.trips add column vehicle_id uuid references public.vehicles(id) on delete set null;
alter table public.expenses add column vehicle_id uuid references public.vehicles(id) on delete set null;
create index on public.trips (vehicle_id) where vehicle_id is not null;
create index on public.expenses (vehicle_id) where vehicle_id is not null;
