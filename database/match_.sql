-- =====================================================================
-- Place4U: Match acceptance & session-scheduling pipeline
--
-- Extends the agent "ship" workflow in database/application_match_draft.sql
-- (public.application_property_matches) into a multi-party acceptance flow:
--
--   shipped            Agent shipped the shortlist to the tenant.
--   tenant_accepted    Tenant accepted this match + opted into a session.
--   agent_forwarded    Agent notified + forwarded tenant info to the landlord.
--   landlord_accepted  Landlord (interested party) accepted the match.
--   admin_approved     Place4U admin signed off.
--   scheduled          A viewing / meeting slot has been arranged.
--
-- Off-ramps: tenant_declined | landlord_declined | admin_rejected | cancelled
--
-- A tenant may accept MANY matches per application (matched by property).
--
-- Run AFTER application_match_draft.sql. Additive and idempotent — safe to
-- re-run.  Supabase SQL Editor:
--   https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pipeline columns on the existing pair table
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  add column if not exists tenant_accepted_at     timestamptz,
  add column if not exists tenant_opt_in_session  boolean not null default false,
  add column if not exists tenant_session_prefs   jsonb,          -- preferred dates / times / area
  add column if not exists agent_forwarded_at     timestamptz,
  add column if not exists landlord_accepted_at   timestamptz,
  add column if not exists admin_approved_at      timestamptz,
  add column if not exists approved_by            uuid references public.users(id) on delete set null,
  add column if not exists session_status         text,           -- 'proposed'|'confirmed'|'completed'|'cancelled'
  add column if not exists session_scheduled_at   timestamptz,
  add column if not exists session_location       text,
  add column if not exists session_notes          text,
  add column if not exists scheduled_by           uuid references public.users(id) on delete set null,
  add column if not exists decline_reason         text,
  add column if not exists pipeline_updated_at    timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 2. Widen the state CHECK constraint for the pipeline states
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  drop constraint if exists application_property_matches_state_check;
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
      'scheduled','cancelled'
    )
  );

alter table public.application_property_matches
  drop constraint if exists apm_session_status_ck;
alter table public.application_property_matches
  add constraint apm_session_status_ck check (
    session_status is null
    or session_status in ('proposed','confirmed','completed','cancelled')
  );

create index if not exists apm_pipeline_state_idx
  on public.application_property_matches (state)
  where state not in ('flagged','skipped');

-- ---------------------------------------------------------------------
-- 3. Keep applications.agent_working_status correct across the pipeline.
--    (Previously it counted only state='shipped', so a tenant accepting a
--    match would have wrongly reverted the application to 'working'.)
-- ---------------------------------------------------------------------
create or replace function public.apm_sync_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_id  uuid;
  v_flag_n  int;
  v_ship_n  int;
begin
  v_app_id := coalesce(new.application_id, old.application_id);

  select
    count(*) filter (where state = 'flagged'),
    count(*) filter (where state not in ('flagged','skipped'))
  into v_flag_n, v_ship_n
  from public.application_property_matches
  where application_id = v_app_id;

  update public.applications
     set agent_working_status =
           case
             when agent_working_status = 'rejected' then 'rejected'
             when v_ship_n > 0                      then 'shipped'
             when v_flag_n > 0                      then 'draft_complete'
             else                                        'working'
           end
   where id = v_app_id
     and agent_working_status is distinct from 'rejected'
     and not (agent_working_status = 'shipped' and v_ship_n = 0);

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Replace the hard "no unshipping" guard with a pipeline transition
--    whitelist. (The old guard blocked shipped -> tenant_accepted.)
-- ---------------------------------------------------------------------
drop trigger if exists apm_no_unshipped on public.application_property_matches;
drop function if exists public.apm_no_unshipped();

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
    when 'scheduled'         then new.state in ('cancelled')
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

drop trigger if exists apm_guard_transition on public.application_property_matches;
create trigger apm_guard_transition
  before update on public.application_property_matches
  for each row execute function public.apm_guard_transition();

-- ---------------------------------------------------------------------
-- 5. Audit trail + notification feed
-- ---------------------------------------------------------------------
create table if not exists public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.application_property_matches(id) on delete cascade,
  event_type  text not null,
  from_state  text,
  to_state    text,
  actor_id    uuid references public.users(id) on delete set null,
  actor_role  text,           -- 'tenant' | 'agent' | 'landlord' | 'admin'
  target_role text,           -- who this event notifies (next actor)
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists match_events_match_idx on public.match_events (match_id, created_at desc);
create index if not exists match_events_target_idx on public.match_events (target_role, created_at desc);

alter table public.match_events enable row level security;

drop policy if exists match_events_read on public.match_events;
-- Readable by anyone who can see the parent match.
create policy match_events_read on public.match_events
  for select using (
    exists (
      select 1 from public.application_property_matches m
      where m.id = match_events.match_id
    )
  );

-- Inserts happen inside SECURITY DEFINER RPCs; no direct client inserts.
drop policy if exists match_events_no_direct_write on public.match_events;

-- ---------------------------------------------------------------------
-- 6. Visibility: widen tenant reads, add landlord reads
-- ---------------------------------------------------------------------
alter table public.application_property_matches enable row level security;

drop policy if exists apm_tenant_read_shipped on public.application_property_matches;
drop policy if exists apm_tenant_read on public.application_property_matches;

-- Tenant can read every accepted-pipeline pair for their own applications.
-- Flagged/skipped rows are the agent's private draft and stay hidden.
create policy apm_tenant_read on public.application_property_matches
  for select using (
    application_property_matches.state not in ('flagged','skipped')
    and exists (
      select 1 from public.applications a
      where a.id = application_property_matches.application_id
        and a.tenant_id = auth.uid()
    )
  );

drop policy if exists apm_landlord_read on public.application_property_matches;
-- Landlord (interested party) can read pairs for properties they own, but only
-- once the agent has actually forwarded the applicant to them (or later).
create policy apm_landlord_read on public.application_property_matches
  for select using (
    application_property_matches.state in (
      'agent_forwarded','landlord_accepted','landlord_declined',
      'admin_approved','admin_rejected','scheduled','cancelled'
    )
    and exists (
      select 1 from public.properties p
      where p.id = application_property_matches.property_id
        and p.landlord_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 7. Transition RPCs (SECURITY DEFINER — validated per role + state)
-- ---------------------------------------------------------------------

-- 7.1 Tenant accepts a shipped match and opts into a session.
create or replace function public.match_accept_by_tenant(
  p_match_id uuid,
  p_opt_in_session boolean default true,
  p_session_prefs jsonb default null,
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
  ) then
    raise exception 'Not authorized for this application' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'shipped' then
    raise exception 'Match is not awaiting tenant acceptance (state=%)', v_row.state
      using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state                = 'tenant_accepted',
         tenant_accepted_at   = now(),
         tenant_opt_in_session= coalesce(p_opt_in_session, true),
         tenant_session_prefs = coalesce(p_session_prefs, tenant_session_prefs),
         pipeline_updated_at  = now()
   where id = p_match_id
   returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'tenant_accepted', 'shipped', 'tenant_accepted', auth.uid(), 'tenant', 'agent', p_note);

  return v_row;
end;
$$;

-- 7.2 Tenant declines a match.
create or replace function public.match_decline_by_tenant(p_match_id uuid, p_reason text default null)
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
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  if not exists (
    select 1 from public.applications a
    where a.id = v_row.application_id and a.tenant_id = auth.uid()
  ) then
    raise exception 'Not authorized for this application' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state not in ('shipped','tenant_accepted') then
    raise exception 'Match cannot be declined from state %', v_row.state using errcode = 'check_violation';
  end if;

  v_from := v_row.state;

  update public.application_property_matches
     set state = 'tenant_declined', decline_reason = p_reason, pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'tenant_declined', v_from, 'tenant_declined', auth.uid(), 'tenant', 'agent', p_reason);

  return v_row;
end;
$$;

-- 7.3 Agent forwards the accepted match (tenant info) to the landlord.
create or replace function public.match_forward_by_agent(p_match_id uuid, p_note text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_role text;
  v_assigned uuid;
begin
  select user_type into v_role from public.users where id = auth.uid();
  if v_role not in ('agent','admin') then
    raise exception 'Only an agent or admin can forward a match' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  select assigned_to into v_assigned from public.applications where id = v_row.application_id;
  if v_role = 'agent' and not (v_row.agent_id = auth.uid() or v_assigned = auth.uid()) then
    raise exception 'Not your match to forward' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'tenant_accepted' then
    raise exception 'Match is not awaiting agent forwarding (state=%)', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state = 'agent_forwarded', agent_forwarded_at = now(), pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'agent_forwarded', 'tenant_accepted', 'agent_forwarded', auth.uid(), v_role, 'landlord', p_note);

  return v_row;
end;
$$;

-- 7.4 Landlord (interested party) accepts the forwarded match.
create or replace function public.match_accept_by_landlord(p_match_id uuid, p_note text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  if not exists (
    select 1 from public.properties p
    where p.id = v_row.property_id and p.landlord_id = auth.uid()
  ) then
    raise exception 'Not the owner of this property' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'agent_forwarded' then
    raise exception 'Match is not awaiting landlord acceptance (state=%)', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state = 'landlord_accepted', landlord_accepted_at = now(), pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'landlord_accepted', 'agent_forwarded', 'landlord_accepted', auth.uid(), 'landlord', 'admin', p_note);

  return v_row;
end;
$$;

-- 7.5 Landlord declines.
create or replace function public.match_decline_by_landlord(p_match_id uuid, p_reason text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
begin
  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  if not exists (
    select 1 from public.properties p
    where p.id = v_row.property_id and p.landlord_id = auth.uid()
  ) then
    raise exception 'Not the owner of this property' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'agent_forwarded' then
    raise exception 'Match cannot be declined from state %', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state = 'landlord_declined', decline_reason = p_reason, pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'landlord_declined', 'agent_forwarded', 'landlord_declined', auth.uid(), 'landlord', 'agent', p_reason);

  return v_row;
end;
$$;

-- 7.6 Admin signs off.
create or replace function public.match_approve_by_admin(p_match_id uuid, p_note text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_role text;
begin
  select user_type into v_role from public.users where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'Only an admin can approve a match' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  if v_row.state <> 'landlord_accepted' then
    raise exception 'Match is not awaiting admin approval (state=%)', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state = 'admin_approved', admin_approved_at = now(), approved_by = auth.uid(), pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'admin_approved', 'landlord_accepted', 'admin_approved', auth.uid(), 'admin', 'agent', p_note);

  return v_row;
end;
$$;

-- 7.7 Admin rejects.
create or replace function public.match_reject_by_admin(p_match_id uuid, p_reason text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_role text;
begin
  select user_type into v_role from public.users where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'Only an admin can reject a match' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  if v_row.state <> 'landlord_accepted' then
    raise exception 'Match cannot be rejected from state %', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state = 'admin_rejected', decline_reason = p_reason, pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'admin_rejected', 'landlord_accepted', 'admin_rejected', auth.uid(), 'admin', 'agent', p_reason);

  return v_row;
end;
$$;

-- 7.8 Agent (or admin) schedules the viewing / meeting slot.
create or replace function public.match_schedule_session(
  p_match_id uuid,
  p_scheduled_at timestamptz,
  p_location text default null,
  p_notes text default null
)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_role text;
  v_assigned uuid;
begin
  select user_type into v_role from public.users where id = auth.uid();
  if v_role not in ('agent','admin') then
    raise exception 'Only an agent or admin can schedule a session' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  select assigned_to into v_assigned from public.applications where id = v_row.application_id;
  if v_role = 'agent' and not (v_row.agent_id = auth.uid() or v_assigned = auth.uid()) then
    raise exception 'Not your match to schedule' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state <> 'admin_approved' then
    raise exception 'Match is not approved for scheduling (state=%)', v_row.state using errcode = 'check_violation';
  end if;

  update public.application_property_matches
     set state               = 'scheduled',
         session_status      = 'confirmed',
         session_scheduled_at= p_scheduled_at,
         session_location    = p_location,
         session_notes       = p_notes,
         scheduled_by        = auth.uid(),
         pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'scheduled', 'admin_approved', 'scheduled', auth.uid(), v_role, 'tenant', p_notes);

  return v_row;
end;
$$;

-- 7.9 Cancel an active match (tenant, agent, landlord, or admin).
create or replace function public.match_cancel(p_match_id uuid, p_reason text default null)
returns public.application_property_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.application_property_matches;
  v_role text;
  v_allowed boolean;
begin
  select user_type into v_role from public.users where id = auth.uid();

  select * into v_row from public.application_property_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'no_data_found'; end if;

  v_allowed :=
    v_role = 'admin'
    or exists (select 1 from public.applications a where a.id = v_row.application_id and a.tenant_id = auth.uid())
    or exists (select 1 from public.properties p where p.id = v_row.property_id and p.landlord_id = auth.uid())
    or v_row.agent_id = auth.uid();

  if not v_allowed then
    raise exception 'Not authorized to cancel this match' using errcode = 'insufficient_privilege';
  end if;

  if v_row.state in ('cancelled','tenant_declined','landlord_declined','admin_rejected') then
    return v_row; -- already terminal
  end if;

  update public.application_property_matches
     set state = 'cancelled', decline_reason = p_reason, pipeline_updated_at = now()
   where id = p_match_id returning * into v_row;

  insert into public.match_events (match_id, event_type, from_state, to_state, actor_id, actor_role, target_role, note)
  values (p_match_id, 'cancelled', null, 'cancelled', auth.uid(), v_role, null, p_reason);

  return v_row;
end;
$$;

grant execute on function public.match_accept_by_tenant(uuid, boolean, jsonb, text) to authenticated;
grant execute on function public.match_decline_by_tenant(uuid, text)              to authenticated;
grant execute on function public.match_forward_by_agent(uuid, text)               to authenticated;
grant execute on function public.match_accept_by_landlord(uuid, text)             to authenticated;
grant execute on function public.match_decline_by_landlord(uuid, text)            to authenticated;
grant execute on function public.match_approve_by_admin(uuid, text)               to authenticated;
grant execute on function public.match_reject_by_admin(uuid, text)                to authenticated;
grant execute on function public.match_schedule_session(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.match_cancel(uuid, text)                         to authenticated;

-- ---------------------------------------------------------------------
-- 8. Reload PostgREST so the new columns / RPCs are visible immediately.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
