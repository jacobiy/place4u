-- ==============================================================================
-- Place4U: Agent Profile & Settings Schema Fix
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- The agent Profile and Settings pages write fields that did not exist on
-- public.agent_profiles, so their saves were silently dropped:
--   * Profile page   -> bio, profile picture
--   * Settings page  -> notification toggles + commission payout banking details
--
-- This migration is additive and idempotent: safe to run on a fresh database
-- or an existing one. It never drops data.
--
-- NOTE: Agent FICA documents (ID, proof of residence, Fidelity Fund
-- Certificate) are uploaded to the dedicated private 'agent-documents' bucket
-- under the path:  agents/<userId>/<docType>-<timestamp>-<filename>
-- See database/agent_application.sql, which creates that bucket plus the
-- matching storage policies. (The 'agent-profiles' bucket created below is
-- only for public avatars.)
-- ==============================================================================


-- 1) Add the missing agent_profiles columns
-- ------------------------------------------------------------------------------
alter table public.agent_profiles
  -- Professional biography shown to tenants and landlords
  add column if not exists bio text null,
  -- Public avatar URL (stored in the 'agent-profiles' storage bucket)
  add column if not exists profile_image_url text null,

  -- Notification preferences (Placement Notifications & Alerts toggles)
  add column if not exists whatsapp_alerts boolean null default true,
  add column if not exists email_digest boolean null default true,
  add column if not exists commission_alerts boolean null default true,
  add column if not exists viewing_alerts boolean null default true,

  -- Commission payout banking details
  add column if not exists bank_name character varying(100) null,
  add column if not exists account_holder character varying(255) null,
  add column if not exists account_number character varying(50) null,
  add column if not exists branch_code character varying(20) null,
  add column if not exists account_type character varying(50) null default 'Cheque / Current';


-- 2) Backfill sensible defaults for any existing rows
-- ------------------------------------------------------------------------------
update public.agent_profiles
set
  whatsapp_alerts = coalesce(whatsapp_alerts, true),
  email_digest = coalesce(email_digest, true),
  commission_alerts = coalesce(commission_alerts, true),
  viewing_alerts = coalesce(viewing_alerts, true),
  account_type = coalesce(account_type, 'Cheque / Current')
where
  whatsapp_alerts is null
  or email_digest is null
  or commission_alerts is null
  or viewing_alerts is null
  or account_type is null;


-- 3) Keep updated_at fresh on every write (recreate idempotently)
-- ------------------------------------------------------------------------------
create or replace function public.handle_agent_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_agent_profiles_updated_at on public.agent_profiles;
create trigger trigger_agent_profiles_updated_at
  before update on public.agent_profiles
  for each row
  execute function public.handle_agent_profiles_updated_at();


-- 4) Row Level Security (idempotent, matches agent_schema.sql)
-- ------------------------------------------------------------------------------
alter table public.agent_profiles enable row level security;

drop policy if exists "Agents can view own profile" on public.agent_profiles;
create policy "Agents can view own profile"
  on public.agent_profiles for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.user_type = 'admin'
    )
  );

drop policy if exists "Agents can insert own profile" on public.agent_profiles;
create policy "Agents can insert own profile"
  on public.agent_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Agents can update own profile" on public.agent_profiles;
create policy "Agents can update own profile"
  on public.agent_profiles for update
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

grant all on public.agent_profiles to authenticated;
grant all on public.agent_profiles to service_role;


-- ==============================================================================
-- 5) New public 'agent-profiles' Storage Bucket (agent avatars / profile pics)
-- ------------------------------------------------------------------------------
-- Object paths follow:  <userId>/avatar-<timestamp>.<ext>
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-profiles',
  'agent-profiles',
  true,                -- Public read so avatars render with a plain <img src>
  5242880,             -- 5 MB max file size limit
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];


-- 6) Storage policies for 'agent-profiles'
-- ------------------------------------------------------------------------------
drop policy if exists "agent_profiles_public_select" on storage.objects;
drop policy if exists "agent_profiles_auth_insert" on storage.objects;
drop policy if exists "agent_profiles_auth_update" on storage.objects;
drop policy if exists "agent_profiles_auth_delete" on storage.objects;

-- SELECT: avatars are publicly readable
create policy "agent_profiles_public_select"
  on storage.objects for select
  using (bucket_id = 'agent-profiles');

-- INSERT: a user may only upload into their own folder
create policy "agent_profiles_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'agent-profiles'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
    )
  );

-- UPDATE: a user may only replace their own avatar
create policy "agent_profiles_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'agent-profiles'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
    )
  );

-- DELETE: a user may only delete their own avatar
create policy "agent_profiles_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'agent-profiles'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
    )
  );
