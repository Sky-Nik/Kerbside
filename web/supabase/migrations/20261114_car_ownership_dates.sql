-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14.
-- Car bought/sold part-way through a financial year: odometer readings belong to these dates.
alter table public.years add column car_start_date date, add column car_end_date date;
alter table public.years add constraint years_car_dates_check check (car_end_date is null or car_start_date is null or car_end_date >= car_start_date);
