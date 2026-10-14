-- ==============================================================================
-- Place4U: Tenant Profiles Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- This file is idempotent: it creates the table on a fresh database and safely
-- upgrades an existing one with any missing columns. Every editable text field
-- on the tenant Profile page maps to a column below.
-- ==============================================================================

-- 1) Create the table (fresh installs)
create table if not exists public.tenant_profiles (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  full_name character varying(150) null,
  email character varying(255) null,
  profile_image_url text null,
  date_of_birth date null,
  employment_status character varying(50) null,
  monthly_income numeric(10, 2) null,
  current_address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  has_pets boolean null default false,
  phone character varying(20) null,
  id_number character varying(50) null,
  emergency_contact_name character varying(100) null,
  emergency_contact_phone character varying(20) null,
  account_tier character varying(20) null default 'basic',
  is_verified boolean null default false,
  references_provided boolean null default false,
  assistance_fee_paid boolean null default false,
  notification_preferences jsonb null default '{"email": true, "sms": false, "rent_reminders": true}'::jsonb,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),
  constraint tenant_profiles_pkey primary key (id),
  constraint tenant_profiles_user_id_key unique (user_id),
  constraint tenant_profiles_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
);


-- 2) Upgrade an existing table with any missing columns
-- ------------------------------------------------------------------------------
alter table public.tenant_profiles
  add column if not exists full_name character varying(150) null,
  add column if not exists email character varying(255) null,
  add column if not exists profile_image_url text null,
  add column if not exists date_of_birth date null,
  add column if not exists employment_status character varying(50) null,
  add column if not exists monthly_income numeric(10, 2) null,
  add column if not exists current_address text null,
  add column if not exists city character varying(100) null,
  add column if not exists state character varying(100) null,
  add column if not exists postal_code character varying(20) null,
  add column if not exists has_pets boolean null default false,
  add column if not exists phone character varying(20) null,
  add column if not exists id_number character varying(50) null,
  add column if not exists emergency_contact_name character varying(100) null,
  add column if not exists emergency_contact_phone character varying(20) null,
  add column if not exists account_tier character varying(20) null default 'basic',
  add column if not exists is_verified boolean null default false,
  add column if not exists references_provided boolean null default false,
  add column if not exists assistance_fee_paid boolean null default false,
  add column if not exists notification_preferences jsonb null default '{"email": true, "sms": false, "rent_reminders": true}'::jsonb,
  add column if not exists created_at timestamptz null default now(),
  add column if not exists updated_at timestamptz null default now();


-- 3) Indexes
-- ------------------------------------------------------------------------------
create index if not exists idx_tenant_profiles_user_id on public.tenant_profiles (user_id);
create index if not exists idx_tenant_profiles_email on public.tenant_profiles (email);
create index if not exists idx_tenant_profiles_created_at on public.tenant_profiles (created_at);


-- 4) Keep updated_at fresh on every write
-- ------------------------------------------------------------------------------
create or replace function public.handle_tenant_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_tenant_profiles_updated_at on public.tenant_profiles;
create trigger trigger_tenant_profiles_updated_at
  before update on public.tenant_profiles
  for each row
  execute function public.handle_tenant_profiles_updated_at();


-- 5) Row Level Security
-- ------------------------------------------------------------------------------
alter table public.tenant_profiles enable row level security;

-- Tenants can read and manage their own profile; admins can read every profile.
drop policy if exists "Tenants can view own profile" on public.tenant_profiles;
create policy "Tenants can view own profile"
  on public.tenant_profiles for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  );

drop policy if exists "Tenants can insert own profile" on public.tenant_profiles;
create policy "Tenants can insert own profile"
  on public.tenant_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Tenants can update own profile" on public.tenant_profiles;
create policy "Tenants can update own profile"
  on public.tenant_profiles for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  );

drop policy if exists "Tenants can delete own profile" on public.tenant_profiles;
create policy "Tenants can delete own profile"
  on public.tenant_profiles for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  );


-- 6) Grants
-- ------------------------------------------------------------------------------
grant all on public.tenant_profiles to authenticated;
grant all on public.tenant_profiles to service_role;
