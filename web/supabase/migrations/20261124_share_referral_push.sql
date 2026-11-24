-- Accountant read-only links: a visitor (anon role) sending header x-share-token sees the owner's rows, select only.
create table public.shares (
  token text primary key default encode(extensions.gen_random_bytes(18), 'hex'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);
alter table public.shares enable row level security;
create policy "own rows" on public.shares for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.share_owner() returns uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.shares
  where token = nullif(current_setting('request.headers', true)::json ->> 'x-share-token', '') and expires_at > now()
$$;
revoke all on function public.share_owner() from public;
grant execute on function public.share_owner() to anon;

do $$ declare t text; begin
  foreach t in array array['profiles','years','income_entries','other_income','expenses','trips','car_transactions','documents','vehicles','fuel_fills','recurring_expenses'] loop
    execute format('create policy "accountant read" on public.%I for select to anon using (user_id = (select public.share_owner()))', t);
  end loop;
end $$;
create policy "accountant read" on storage.objects for select to anon
  using (bucket_id in ('receipts', 'documents') and (storage.foldername(name))[1] = (select public.share_owner())::text);

-- Referrals: each profile has a code; a new driver claims it once, through claim_referral only.
alter table public.profiles add column ref_code text unique default substr(md5(gen_random_uuid()::text), 1, 8);
update public.profiles set ref_code = substr(md5(gen_random_uuid()::text), 1, 8) where ref_code is null;
create table public.referrals (
  referred uuid primary key references auth.users(id) on delete cascade,
  referrer uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
create policy "see who I referred" on public.referrals for select to authenticated using (referrer = (select auth.uid()));
create function public.claim_referral(code text) returns void language sql security definer set search_path = '' as $$
  insert into public.referrals (referred, referrer)
  select auth.uid(), p.user_id from public.profiles p where p.ref_code = code and p.user_id <> auth.uid()
  on conflict do nothing
$$;
revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;

-- Web push subscriptions (one per browser).
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own rows" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Signed-in drivers only (Supabase grants anon execute by default).
revoke execute on function public.claim_referral(text) from anon;
