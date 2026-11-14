-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14.
-- Income is entered as a from/to date range (usually one week). Existing week/month rows converted.
alter table public.income_entries add column end_date date;
update public.income_entries set end_date = case
  when period = 'week' then start_date + 6
  else (date_trunc('month', start_date) + interval '1 month - 1 day')::date end;
alter table public.income_entries alter column end_date set not null;
alter table public.income_entries drop constraint income_entries_start_check;
alter table public.income_entries drop column period;
alter table public.income_entries add constraint income_entries_range_check check (end_date >= start_date and end_date - start_date <= 92);
