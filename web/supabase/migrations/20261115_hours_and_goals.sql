-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15. Hours online per income entry; earnings goals.
alter table public.income_entries add column hours numeric(6,2) check (hours is null or hours >= 0);
alter table public.profiles add column weekly_goal numeric(10,2) check (weekly_goal is null or weekly_goal >= 0),
  add column monthly_goal numeric(10,2) check (monthly_goal is null or monthly_goal >= 0);
