-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14 (table was empty).
-- Income is entered per week (Monday start) or per month, for Uber and DiDi only.
alter table public.platform_months rename to income_entries;
alter table public.income_entries rename column month to start_date;
alter table public.income_entries drop constraint platform_months_month_check;
alter table public.income_entries drop constraint platform_months_user_id_month_platform_key;
alter table public.income_entries add column period text not null default 'week' check (period in ('week','month'));
alter table public.income_entries add constraint income_entries_start_check check (
  (period = 'week' and extract(isodow from start_date) = 1) or
  (period = 'month' and extract(day from start_date) = 1));
alter table public.income_entries add constraint income_entries_platform_check check (platform in ('Uber','DiDi'));
alter table public.income_entries add constraint income_entries_unique unique (user_id, period, start_date, platform);
alter table public.income_entries add column created_at timestamptz not null default now();
