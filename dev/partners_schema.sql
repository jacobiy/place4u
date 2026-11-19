-- ==============================================================================
-- Place4U — PARTNERS MANAGEMENT SCHEMA
-- ==============================================================================
--  Target: Run in Supabase SQL Editor (Dev / Staging / Prod)
--
--  PURPOSE:
--    Allows Admin to manage partner relationships (caretakers, building managers,
--    landlords, property developers, institutions, leasing agencies) in a spreadsheet-style
--    workflow.
--
--  FIELDS:
--    - first_name, last_name (name, surname)
--    - location (area / suburb / city)
--    - building_name (name of building / complex)
--    - building_id (optional FK linking to public.buildings if asset is registered)
--    - status (lead, contacted, meeting_scheduled, onboarding, active, paused, inactive)
--    - partner_type (building_manager, caretaker, landlord, developer, agency, etc.)
--    - contact details (phone, email)
--    - notes, units_count, commission_deal
--
--  ADDITIVE & IDEMPOTENT:
--    Safe to re-run. Will not overwrite existing data.
-- ==============================================================================

-- 1. Create public.partners table
create table if not exists public.partners (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null,
  last_name        text not null default '',
  location         text not null default '',
  building_name    text not null default '',
  building_id      uuid references public.buildings(id) on delete set null,
  institution      text not null default 'UJ',
  building_type    text not null default 'student_accommodation',
  partner_type     text not null default 'building_manager',
  status           text not null default 'lead',
  phone            text default '',
  email            text default '',
  contact_person   text default '',
  units_count      integer default 0,
  commission_deal  text default '',
  notes            text default '',
  metadata         jsonb not null default '{}'::jsonb,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.partners
  add column if not exists institution text not null default 'UJ',
  add column if not exists building_type text not null default 'student_accommodation';

-- 2. Constraints
alter table public.partners
  drop constraint if exists partners_status_check;
alter table public.partners
  add constraint partners_status_check
  check (status in (
    'lead',
    'contacted',
    'meeting_scheduled',
    'negotiating',
    'onboarding',
    'active',
    'paused',
    'inactive',
    'rejected'
  ));

alter table public.partners
  drop constraint if exists partners_type_check;
alter table public.partners
  add constraint partners_type_check
  check (partner_type in (
    'building_manager',
    'caretaker',
    'landlord',
    'developer',
    'agency',
    'institution',
    'investor',
    'other'
  ));

-- 3. Indexes for fast search and spreadsheet filtering
create index if not exists idx_partners_status on public.partners(status);
create index if not exists idx_partners_location on public.partners(location);
create index if not exists idx_partners_building_name on public.partners(building_name);
create index if not exists idx_partners_created_at on public.partners(created_at desc);

-- 4. Automatic updated_at trigger
create or replace function public.update_partners_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_partners_updated_at on public.partners;
create trigger set_partners_updated_at
  before update on public.partners
  for each row
  execute function public.update_partners_updated_at();

-- 5. Row Level Security (RLS)
alter table public.partners enable row level security;

-- Admin can perform all operations (SELECT, INSERT, UPDATE, DELETE)
drop policy if exists "Admins have full access to partners" on public.partners;
create policy "Admins have full access to partners"
  on public.partners
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.user_type = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.user_type = 'admin'
    )
  );
