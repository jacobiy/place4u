-- =====================================================================
-- Place4U: Match Pipeline Extension — Move-in Date Scheduling & Confirmation
--
-- Enables post-lease move-in date coordination:
--   1. Landlord sets an official move-in date, handover time, meeting
--      location, and arrival instructions once the lease is signed.
--   2. Tenant reviews the schedule and confirms attendance.
--   3. Transitions match state from 'lease_signed' -> 'move_in_confirmed'.
--
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Move-in columns on public.application_property_matches
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  add column if not exists move_in_date         date,
  add column if not exists move_in_time         text,
  add column if not exists move_in_location     text,
  add column if not exists move_in_instructions text,
  add column if not exists move_in_set_at       timestamptz,
  add column if not exists move_in_confirmed_at timestamptz,
  add column if not exists move_in_status       text default 'pending_date';

-- ---------------------------------------------------------------------
-- 2. Widen the state CHECK constraint to include 'move_in_confirmed'
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
-- 4. Ensure Landlord RLS reads lease_signed and move_in_confirmed rows
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
-- 5. RPC: Landlord proposes or updates the move-in schedule
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
-- 6. RPC: Tenant confirms the move-in schedule
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

-- ---------------------------------------------------------------------
-- 7. Grant execution privileges to authenticated users
-- ---------------------------------------------------------------------
grant execute on function public.match_set_move_in_date(uuid, date, text, text, text, text) to authenticated;
grant execute on function public.match_confirm_move_in(uuid, text) to authenticated;

notify pgrst, 'reload schema';
