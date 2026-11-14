-- Applied to project buxpbhyllrwfiebvlkwh on 2026-11-15.
-- Onboarding choices, three more platforms, documents (tax returns / platform summaries) with a private bucket.
alter table public.profiles
  add column work_types text[] check (work_types <@ array['rideshare','delivery']::text[]),
  add column platforms text[] check (platforms <@ array['Uber','DiDi','Uber Eats','DoorDash','HungryPanda']::text[]);
alter table public.income_entries drop constraint income_entries_platform_check;
alter table public.income_entries add constraint income_entries_platform_check
  check (platform in ('Uber','DiDi','Uber Eats','DoorDash','HungryPanda'));
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tax_return','platform_summary','other')),
  fy text check (fy ~ '^\d{4}-\d{2}$'),
  title text not null, storage_path text not null, file_name text,
  parsed jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on public.documents (user_id, kind, fy);
alter table public.documents enable row level security;
create policy "own rows" on public.documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter table public.income_entries add column source_document_id uuid references public.documents(id) on delete set null;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','image/heic']);
create policy "documents: own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
