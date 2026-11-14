-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-14. Inputs for the refund / amount-owing estimate.
alter table public.years
  add column wages numeric(12,2) not null default 0,
  add column tax_withheld numeric(12,2) not null default 0,
  add column payg_instalments numeric(12,2) not null default 0,
  add column other_income numeric(12,2) not null default 0,
  add column other_deductions numeric(12,2) not null default 0;
