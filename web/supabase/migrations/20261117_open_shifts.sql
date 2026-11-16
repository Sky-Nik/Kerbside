-- Open (in-progress) logbook shift per user, so a shift started on one device can be ended on another.
create table public.open_shifts (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  odo integer not null check (odo >= 0),
  started_at timestamptz not null default now(),
  photo text,
  vehicle_id uuid references public.vehicles(id) on delete set null
);
alter table public.open_shifts enable row level security;
create policy "own rows" on public.open_shifts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
