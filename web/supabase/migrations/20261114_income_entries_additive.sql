-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14.
-- Bug fix: saving the same week again silently replaced earlier income. Each save is now its own entry.
alter table public.income_entries drop constraint income_entries_unique;
create index if not exists income_entries_user_start_idx on public.income_entries (user_id, start_date);
