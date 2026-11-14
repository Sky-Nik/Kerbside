-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14.
-- Lets one logbook entry span several days (e.g. a whole week of rideshare driving).
alter table public.trips add column end_date date;
alter table public.trips add constraint trips_end_date_check check (end_date is null or end_date >= date);
