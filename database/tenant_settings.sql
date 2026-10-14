-- ==============================================================================
-- Place4U: Tenant Account Settings Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- Stores every account-level preference toggled from the tenant Settings page:
-- notifications, communication & locale, appearance, privacy, security and the
-- POPIA data-rights consent / lifecycle flags.
--
-- This file is idempotent: safe to run on a fresh database or an existing one.
-- ==============================================================================

-- 1) Create the table (fresh installs)
create table if not exists public.tenant_settings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,

  -- Notifications -----------------------------------------------------------
  notify_email boolean null default true,
  notify_sms boolean null default false,
  notify_whatsapp boolean null default true,
  notify_push boolean null default false,
  notify_rent_reminders boolean null default true,
  notify_application_updates boolean null default true,
  notify_property_alerts boolean null default false,
  notify_marketing boolean null default false,

  -- Communication & locale --------------------------------------------------
  contact_preference character varying(20) null default 'email',   -- email | sms | whatsapp
  language character varying(10) null default 'en',                -- en | zu | xh | af | st | tn
  currency character varying(3) null default 'ZAR',
  timezone character varying(64) null default 'Africa/Johannesburg',
  quiet_hours_start time null,
  quiet_hours_end time null,

  -- Appearance --------------------------------------------------------------
  theme character varying(10) null default 'system',               -- light | dark | system

  -- Privacy & visibility ----------------------------------------------------
  profile_visibility character varying(20) null default 'landlords_only', -- public | landlords_only | private
  show_phone boolean null default false,
  show_email boolean null default false,

  -- Security ----------------------------------------------------------------
  two_factor_enabled boolean null default false,
  login_alerts boolean null default true,
  last_password_change timestamptz null,

  -- POPIA / data rights -----------------------------------------------------
  data_processing_consent boolean null default true,
  consent_updated_at timestamptz null,
  deletion_requested_at timestamptz null,

  -- Account lifecycle -------------------------------------------------------
  account_status character varying(20) null default 'active',      -- active | deactivated
  deactivated_at timestamptz null,

  -- Timestamps --------------------------------------------------------------
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),

  constraint tenant_settings_pkey primary key (id),
  constraint tenant_settings_user_id_key unique (user_id),
  constraint tenant_settings_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
);


-- 2) Upgrade an existing table with any missing columns
-- ------------------------------------------------------------------------------
alter table public.tenant_settings
  add column if not exists notify_email boolean null default true,
  add column if not exists notify_sms boolean null default false,
  add column if not exists notify_whatsapp boolean null default true,
  add column if not exists notify_push boolean null default false,
  add column if not exists notify_rent_reminders boolean null default true,
  add column if not exists notify_application_updates boolean null default true,
  add column if not exists notify_property_alerts boolean null default false,
  add column if not exists notify_marketing boolean null default false,
  add column if not exists contact_preference character varying(20) null default 'email',
  add column if not exists language character varying(10) null default 'en',
  add column if not exists currency character varying(3) null default 'ZAR',
  add column if not exists timezone character varying(64) null default 'Africa/Johannesburg',
  add column if not exists quiet_hours_start time null,
  add column if not exists quiet_hours_end time null,
  add column if not exists theme character varying(10) null default 'system',
  add column if not exists profile_visibility character varying(20) null default 'landlords_only',
  add column if not exists show_phone boolean null default false,
  add column if not exists show_email boolean null default false,
  add column if not exists two_factor_enabled boolean null default false,
  add column if not exists login_alerts boolean null default true,
  add column if not exists last_password_change timestamptz null,
  add column if not exists data_processing_consent boolean null default true,
  add column if not exists consent_updated_at timestamptz null,
  add column if not exists deletion_requested_at timestamptz null,
  add column if not exists account_status character varying(20) null default 'active',
  add column if not exists deactivated_at timestamptz null,
  add column if not exists created_at timestamptz null default now(),
  add column if not exists updated_at timestamptz null default now();


-- 3) Indexes
-- ------------------------------------------------------------------------------
create index if not exists idx_tenant_settings_user_id on public.tenant_settings (user_id);
create index if not exists idx_tenant_settings_account_status on public.tenant_settings (account_status);
create index if not exists idx_tenant_settings_created_at on public.tenant_settings (created_at);


-- 4) Keep updated_at fresh on every write
-- ------------------------------------------------------------------------------
create or replace function public.handle_tenant_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_tenant_settings_updated_at on public.tenant_settings;
create trigger trigger_tenant_settings_updated_at
  before update on public.tenant_settings
  for each row
  execute function public.handle_tenant_settings_updated_at();


-- 5) Row Level Security
-- ------------------------------------------------------------------------------
alter table public.tenant_settings enable row level security;

drop policy if exists "Tenants can view own settings" on public.tenant_settings;
create policy "Tenants can view own settings"
  on public.tenant_settings for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  );

drop policy if exists "Tenants can insert own settings" on public.tenant_settings;
create policy "Tenants can insert own settings"
  on public.tenant_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Tenants can update own settings" on public.tenant_settings;
create policy "Tenants can update own settings"
  on public.tenant_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Tenants can delete own settings" on public.tenant_settings;
create policy "Tenants can delete own settings"
  on public.tenant_settings for delete
  to authenticated
  using (auth.uid() = user_id);


-- 6) Grants
-- ------------------------------------------------------------------------------
grant all on public.tenant_settings to authenticated;
grant all on public.tenant_settings to service_role;


-- 7) Auto-provision a settings row when a new tenant profile is created
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_tenant_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.tenant_settings (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_tenant_profiles_new_settings on public.tenant_profiles;
create trigger trigger_tenant_profiles_new_settings
  after insert on public.tenant_profiles
  for each row
  execute function public.handle_new_tenant_settings();
