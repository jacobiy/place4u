-- ==============================================================================
-- Place4U: Agent Application (Onboarding / FICA Verification)
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- This migration formalises the agent application workflow:
--   1. Ensures public.agent_profiles exists with every field the application
--      form submits (personal info, professional credentials, FICA docs,
--      interview preferences and verification state).
--   2. Creates the dedicated private storage bucket 'agent-documents' that holds
--      the uploaded FICA files (SA ID, proof of residence, Fidelity Fund
--      Certificate). Object paths follow:  agents/<userId>/<docType>-<ts>-<name>
--   3. Recreates the agent_verification_queue view the admin uses to review
--      applications.
--
-- Additive & idempotent: safe to run on a fresh database or an existing one,
-- and safe to run repeatedly. It never drops data.
-- ==============================================================================


-- ==============================================================================
-- 1) public.agent_profiles — the agent's application record
-- ==============================================================================
create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Personal & contact information
alter table public.agent_profiles
  add column if not exists full_name varchar(255) null,
  add column if not exists email varchar(255) null,
  add column if not exists phone varchar(50) null,
  add column if not exists id_number varchar(50) null,
  add column if not exists address text null,
  add column if not exists city varchar(100) null,
  add column if not exists province varchar(100) null,
  add column if not exists postal_code varchar(20) null,

  -- Professional credentials
  add column if not exists agency_name varchar(255) null,
  add column if not exists experience_years integer default 0,
  add column if not exists tax_number varchar(100) null,
  add column if not exists fidelity_fund_cert_url text null,
  add column if not exists bio text null,
  add column if not exists profile_image_url text null,

  -- FICA document uploads (storage object paths, not base64 blobs)
  add column if not exists id_document_url text null,
  add column if not exists proof_of_residence_url text null,
  add column if not exists additional_documents jsonb default '[]'::jsonb,

  -- Verification & interview workflow state
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_status varchar(50) not null default 'not_applied',
  add column if not exists interview_date timestamptz null,
  add column if not exists interview_time_slot varchar(50) null,
  add column if not exists preferred_contact_method varchar(50) default 'whatsapp',
  add column if not exists interview_notes text null,
  add column if not exists rejection_reason text null,
  add column if not exists submitted_at timestamptz null,
  add column if not exists verified_at timestamptz null,

  -- Settings: notification toggles
  add column if not exists whatsapp_alerts boolean null default true,
  add column if not exists email_digest boolean null default true,
  add column if not exists commission_alerts boolean null default true,
  add column if not exists viewing_alerts boolean null default true,

  -- Settings: commission payout banking details
  add column if not exists bank_name varchar(100) null,
  add column if not exists account_holder varchar(255) null,
  add column if not exists account_number varchar(50) null,
  add column if not exists branch_code varchar(20) null,
  add column if not exists account_type varchar(50) null default 'Cheque / Current';

-- Indexes
create index if not exists idx_agent_profiles_user_id on public.agent_profiles(user_id);
create index if not exists idx_agent_profiles_is_verified on public.agent_profiles(is_verified);
create index if not exists idx_agent_profiles_verification_status on public.agent_profiles(verification_status);

-- Backfill defaults
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


-- ==============================================================================
-- 2) Keep updated_at fresh on every write
-- ==============================================================================
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


-- ==============================================================================
-- 3) Row Level Security on public.agent_profiles
--    Agents own their row; admins can read and update every row.
-- ==============================================================================
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
-- 4) Private 'agent-documents' Storage Bucket
--    Holds the agent's FICA files. PRIVATE (not publicly readable) because these
--    are identity documents; the app reads them through short-lived signed URLs.
--    Object paths:  agents/<userId>/<docType>-<timestamp>-<filename>
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-documents',
  'agent-documents',
  false,               -- PRIVATE: FICA identity documents are never public
  20971520,            -- 20 MB max file size
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];


-- ==============================================================================
-- 5) Storage policies for 'agent-documents'
-- ==============================================================================
drop policy if exists "agent_documents_select" on storage.objects;
drop policy if exists "agent_documents_insert" on storage.objects;
drop policy if exists "agent_documents_update" on storage.objects;
drop policy if exists "agent_documents_delete" on storage.objects;

-- SELECT: the owning agent (own folder) and platform admins (review access)
create policy "agent_documents_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'agent-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
      or exists (
        select 1 from public.users
        where public.users.id = auth.uid()
          and public.users.user_type = 'admin'
      )
    )
  );

-- INSERT: an agent may only upload into their own folder
create policy "agent_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'agent-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
      or exists (
        select 1 from public.users
        where public.users.id = auth.uid()
          and public.users.user_type = 'admin'
      )
    )
  );

-- UPDATE: owner or admin
create policy "agent_documents_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'agent-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
      or exists (
        select 1 from public.users
        where public.users.id = auth.uid()
          and public.users.user_type = 'admin'
      )
    )
  );

-- DELETE: owner or admin
create policy "agent_documents_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'agent-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or owner = auth.uid()
      or exists (
        select 1 from public.users
        where public.users.id = auth.uid()
          and public.users.user_type = 'admin'
      )
    )
  );


-- ==============================================================================
-- 6) Admin review view: agent_verification_queue
--    One row per submitted agent application, joined to the owning account.
--    Dropped first because the column list changed vs. the original view.
-- ==============================================================================
drop view if exists public.agent_verification_queue;

create or replace view public.agent_verification_queue as
select
  ap.id as profile_id,
  ap.user_id,
  ap.full_name,
  ap.email,
  ap.phone,
  ap.id_number,
  ap.address,
  ap.city,
  ap.province,
  ap.postal_code,
  ap.agency_name,
  ap.experience_years,
  ap.tax_number,
  ap.fidelity_fund_cert_url,
  ap.id_document_url,
  ap.proof_of_residence_url,
  ap.preferred_contact_method,
  ap.interview_time_slot,
  ap.is_verified,
  ap.verification_status,
  ap.submitted_at,
  ap.interview_date,
  ap.rejection_reason,
  ap.verified_at,
  ap.created_at,
  ap.updated_at
from public.agent_profiles ap
join public.users u on u.id = ap.user_id
order by ap.submitted_at desc nulls last;

grant select on public.agent_verification_queue to authenticated;
grant select on public.agent_verification_queue to service_role;


-- ==============================================================================
-- Done.
-- Agent application data lives in public.agent_profiles (there is no separate
-- agent_applications table), and uploaded files live in the private
-- 'agent-documents' bucket.
-- ==============================================================================
