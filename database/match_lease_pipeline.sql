-- =====================================================================
-- Place4U: Match Pipeline Extension — Meetup Schedule Acceptance & Lease Workflow
--
-- Extends database/match_.sql with:
--   1. Tenant acceptance of the scheduled session/meetup slot
--   2. Landlord upload of the legal lease agreement (PDF & terms)
--   3. Tenant review, acceptance, and digital signing of the lease
--   4. Automatic resident syncing into public.tenants
--
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lease & Schedule columns on public.application_property_matches
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  add column if not exists tenant_schedule_accepted_at timestamptz,
  add column if not exists lease_uploaded_at           timestamptz,
  add column if not exists lease_url                   text,
  add column if not exists lease_title                 text,
  add column if not exists lease_terms                 jsonb,
  add column if not exists lease_signed_at             timestamptz,
  add column if not exists lease_signature             jsonb,
  add column if not exists signed_lease_url            text,
  add column if not exists move_in_date                date,
  add column if not exists move_in_time                text,
  add column if not exists move_in_location            text,
  add column if not exists move_in_instructions        text,
  add column if not exists move_in_set_at              timestamptz,
  add column if not exists move_in_confirmed_at        timestamptz,
  add column if not exists move_in_status              text default 'pending_date';

-- ---------------------------------------------------------------------
-- 2. Widen the state CHECK constraint to include lease workflow states
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  drop constraint if exists apm_state_check;

alter table public.application_property_matches
  add constraint apm_state_check check (
    state in (
      'flagged','skipped','shipped',
      'tenant_accepted','tenant_declined',
      'agent_forwarded',
      'landlord_accepted','landlord_declined',
      'admin_approved','admin_rejected',
      'scheduled','schedule_accepted',
      'lease_uploaded','lease_signed',
      'move_in_confirmed',
      'cancelled'
    )
  );

-- ---------------------------------------------------------------------
-- 3. Update the state transition guard
-- ---------------------------------------------------------------------
create or replace function public.apm_guard_transition()
returns trigger
language plpgsql
as $$
declare
  v_ok boolean;
begin
  if new.state = old.state then
    return new;
  end if;

  v_ok := case old.state
    when 'flagged'           then new.state in ('skipped','shipped','cancelled')
    when 'skipped'           then new.state in ('flagged','shipped','cancelled')
    when 'shipped'           then new.state in ('tenant_accepted','tenant_declined','cancelled')
    when 'tenant_accepted'   then new.state in ('agent_forwarded','tenant_declined','cancelled')
    when 'agent_forwarded'   then new.state in ('landlord_accepted','landlord_declined','cancelled')
    when 'landlord_accepted' then new.state in ('admin_approved','admin_rejected','cancelled')
    when 'admin_approved'    then new.state in ('scheduled','cancelled')
    when 'scheduled'         then new.state in ('schedule_accepted','lease_uploaded','cancelled')
    when 'schedule_accepted' then new.state in ('lease_uploaded','cancelled')
    when 'lease_uploaded'    then new.state in ('lease_signed','cancelled')
    when 'lease_signed'      then new.state in ('move_in_confirmed','cancelled')
    when 'move_in_confirmed' then new.state in ('cancelled')
    else false            -- declined / rejected / cancelled are terminal
  end;

  if not v_ok then
    raise exception 'Illegal match transition: % -> %', old.state, new.state
      using errcode = 'check_violation';
  end if;

  new.pipeline_updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Ensure Landlord RLS reads lease_uploaded and lease_signed rows
-- ---------------------------------------------------------------------
drop policy if exists apm_landlord_read on public.application_property_matches;
create policy apm_landlord_read on public.application_property_matches
  for select using (
    application_property_matches.state in (
      'agent_forwarded','landlord_accepted','landlord_declined',
      'admin_approved','admin_rejected','scheduled','schedule_accepted',
      'lease_uploaded','lease_signed','move_in_confirmed','cancelled'
    )
    and exists (
      select 1 from public.properties p
      where p.id = application_property_matches.property_id
        and p.landlord_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 5. RPC 1: Tenant accepts the scheduled session / meetup
-- ---------------------------------------------------------------------
create or replace function public.match_accept_schedule(
  p_match_id uuid,
  p_note text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1 from public.applications a
    where a.id = v_row.application_id and a.tenant_id = auth.uid()
  ) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type in ('admin','agent')
  ) then
    raise exception 'Not authorized for this match' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'scheduled' then
    raise exception 'Match is not in scheduled state (state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state                       = 'schedule_accepted',
         tenant_schedule_accepted_at = now(),
         session_status              = 'confirmed',
         pipeline_updated_at         = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'schedule_accepted', 'scheduled', 'schedule_accepted', auth.uid(), 'tenant', 'landlord', p_note);

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RPC 2: Landlord uploads the official lease agreement
-- ---------------------------------------------------------------------
create or replace function public.match_upload_lease(
  p_match_id uuid,
  p_lease_url text,
  p_lease_title text default 'Residential Lease Agreement',
  p_lease_terms jsonb default '{}'::jsonb,
  p_note text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_from text;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1 from public.properties p
    where p.id = v_row.property_id and p.landlord_id = auth.uid()
  ) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type = 'admin'
  ) then
    raise exception 'Only the property landlord or admin can upload a lease' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state not in ('scheduled', 'schedule_accepted') then
    raise exception 'Match is not ready for lease upload (current state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  v_from := v_row.state;

  update public.application_property_matches
     set state               = 'lease_uploaded',
         lease_uploaded_at   = now(),
         lease_url           = p_lease_url,
         lease_title         = coalesce(p_lease_title, 'Residential Lease Agreement'),
         lease_terms         = coalesce(p_lease_terms, '{}'::jsonb),
         session_status      = 'completed',
         pipeline_updated_at = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'lease_uploaded', v_from, 'lease_uploaded', auth.uid(), 'landlord', 'tenant', coalesce(p_note, 'Landlord uploaded official lease agreement for signing'));

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. RPC 3: Tenant reviews, accepts and digitally signs the lease
-- ---------------------------------------------------------------------
create or replace function public.match_sign_lease(
  p_match_id uuid,
  p_signature jsonb,
  p_note text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        public.application_property_matches;
  v_tenant_id  uuid;
  v_prop       public.properties;
  v_user       public.users;
  v_rent       numeric(12,2);
  v_start_date date;
  v_end_date   date;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode = 'no_data_found';
  end if;

  select tenant_id into v_tenant_id from public.applications where id = v_row.application_id;
  if (v_tenant_id is null or v_tenant_id <> auth.uid()) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type = 'admin'
  ) then
    raise exception 'Only the tenant applicant can sign this lease' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'lease_uploaded' then
    raise exception 'Lease is not awaiting signature (state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state               = 'lease_signed',
         lease_signed_at     = now(),
         lease_signature     = coalesce(p_signature, '{}'::jsonb),
         signed_lease_url    = coalesce(p_signature->>'signedLeaseUrl', signed_lease_url),
         pipeline_updated_at = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'lease_signed', 'lease_uploaded', 'lease_signed', auth.uid(), 'tenant', 'landlord', coalesce(p_note, 'Tenant completed and signed the lease agreement'));

  -- Auto-sync resident into public.tenants if the table exists
  begin
    select * into v_prop from public.properties where id = v_row.property_id;
    select * into v_user from public.users where id = coalesce(v_tenant_id, auth.uid());

    v_rent := null;
    if v_row.lease_terms ? 'rent' then
      v_rent := (v_row.lease_terms->>'rent')::numeric;
    elsif v_prop.price is not null then
      v_rent := v_prop.price::numeric;
    end if;

    v_start_date := null;
    if v_row.lease_terms ? 'startDate' and (v_row.lease_terms->>'startDate') <> '' then
      v_start_date := (v_row.lease_terms->>'startDate')::date;
    end if;

    v_end_date := null;
    if v_row.lease_terms ? 'endDate' and (v_row.lease_terms->>'endDate') <> '' then
      v_end_date := (v_row.lease_terms->>'endDate')::date;
    end if;

    if v_prop.landlord_id is not null then
      insert into public.tenants (
        landlord_id,
        property_id,
        user_id,
        application_id,
        full_name,
        email,
        phone,
        rent,
        lease_status,
        lease_start,
        lease_end
      ) values (
        v_prop.landlord_id,
        v_row.property_id,
        coalesce(v_tenant_id, auth.uid()),
        v_row.application_id,
        coalesce(v_user.full_name, p_signature->>'signerName', 'Active Resident'),
        v_user.email,
        v_user.phone,
        v_rent,
        'Active',
        coalesce(v_start_date, current_date),
        coalesce(v_end_date, current_date + interval '12 months')
      );
    end if;
  exception when others then
    -- Do not fail the signature transaction if the tenants table structure differs
    null;
  end;

  return v_row;
end;
$$;

grant execute on function public.match_accept_schedule(uuid, text) to authenticated;
grant execute on function public.match_upload_lease(uuid, text, text, jsonb, text) to authenticated;
grant execute on function public.match_sign_lease(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Allow authenticated tenants and landlords to read lease documents
-- ---------------------------------------------------------------------
drop policy if exists "documents_lease_select" on storage.objects;
create policy "documents_lease_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (name like '%/leases/%' or name like '%/signed_leases/%')
  );

-- ---------------------------------------------------------------------
-- 9. RPC 4: Landlord proposes or updates the move-in schedule
-- ---------------------------------------------------------------------
drop function if exists public.match_set_move_in_date;
create or replace function public.match_set_move_in_date(
  p_match_id             uuid,
  p_move_in_date         date,
  p_move_in_time         text default '10:00',
  p_move_in_location     text default null,
  p_move_in_instructions text default null,
  p_note                 text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1 from public.properties p
    where p.id = v_row.property_id and p.landlord_id = auth.uid()
  ) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type in ('admin','agent')
  ) then
    raise exception 'Only the property landlord, assigned agent, or admin can set the move-in date'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.state not in ('lease_signed', 'move_in_confirmed') then
    raise exception 'Cannot schedule move-in until the lease is signed (current state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set move_in_date         = p_move_in_date,
         move_in_time         = coalesce(p_move_in_time, '10:00'),
         move_in_location     = p_move_in_location,
         move_in_instructions = p_move_in_instructions,
         move_in_set_at       = now(),
         move_in_status       = case when move_in_confirmed_at is not null then 'confirmed' else 'date_proposed' end,
         lease_terms          = coalesce(lease_terms, '{}'::jsonb) || jsonb_build_object(
                                  'moveInDate', p_move_in_date,
                                  'moveInTime', coalesce(p_move_in_time, '10:00'),
                                  'moveInLocation', p_move_in_location,
                                  'moveInInstructions', p_move_in_instructions,
                                  'moveInSetAt', now()
                                ),
         pipeline_updated_at  = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (
    p_match_id,
    'move_in_set',
    v_row.state,
    v_row.state,
    auth.uid(),
    'landlord',
    'tenant',
    coalesce(p_note, 'Landlord scheduled move-in date for ' || p_move_in_date::text)
  );

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. RPC 5: Tenant confirms the move-in schedule
-- ---------------------------------------------------------------------
drop function if exists public.match_confirm_move_in;
create or replace function public.match_confirm_move_in(
  p_match_id uuid,
  p_note     text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        public.application_property_matches;
  v_tenant_id  uuid;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode = 'no_data_found';
  end if;

  select tenant_id into v_tenant_id from public.applications where id = v_row.application_id;
  if (v_tenant_id is null or v_tenant_id <> auth.uid()) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type in ('admin','agent')
  ) then
    raise exception 'Only the tenant applicant can confirm the move-in date'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.state not in ('lease_signed', 'move_in_confirmed') then
    raise exception 'Cannot confirm move-in until the lease is signed (current state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  if v_row.move_in_date is null and (v_row.lease_terms->>'moveInDate') is null then
    raise exception 'No move-in date has been proposed by the landlord yet'
      using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state                = 'move_in_confirmed',
         move_in_confirmed_at = now(),
         move_in_status       = 'confirmed',
         lease_terms          = coalesce(lease_terms, '{}'::jsonb) || jsonb_build_object(
                                  'moveInConfirmedAt', now(),
                                  'moveInStatus', 'confirmed'
                                ),
         pipeline_updated_at  = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (
    p_match_id,
    'move_in_confirmed',
    'lease_signed',
    'move_in_confirmed',
    auth.uid(),
    'tenant',
    'landlord',
    coalesce(p_note, 'Tenant confirmed move-in date and handover schedule')
  );

  return v_row;
end;
$$;

grant execute on function public.match_set_move_in_date(uuid, date, text, text, text, text) to authenticated;
grant execute on function public.match_confirm_move_in(uuid, text) to authenticated;

notify pgrst, 'reload schema';
