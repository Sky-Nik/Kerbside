-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15. Recurring expenses, generated into expenses once per due date.
create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  frequency text not null check (frequency in ('weekly','fortnightly','monthly','quarterly','yearly')),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  last_generated date,
  created_at timestamptz not null default now()
);
create index on public.recurring_expenses (user_id);
alter table public.recurring_expenses enable row level security;
create policy "own rows" on public.recurring_expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter table public.expenses add column recurring_id uuid references public.recurring_expenses(id) on delete set null;
create unique index expenses_recurring_once on public.expenses (recurring_id, date) where recurring_id is not null;
