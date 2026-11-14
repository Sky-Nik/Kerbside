-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15. On-trip km from platform tax summaries.
alter table public.income_entries add column km numeric(10,1) check (km is null or km >= 0);
