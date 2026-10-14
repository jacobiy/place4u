-- =====================================================================
-- Place4U: Agent Application Manager — draft match workflow
-- Per (application, property) pair states, agent-scoped.
--
-- Run this AFTER your existing schema files (tenant/landlord/agent/payments).
-- Additive and idempotent — safe to re-run.
--   Supabase SQL Editor:
--   https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- Flow this enables:
--   1. Agent opens an assigned application in the Application Manager.
--   2. Agent flags properties (private draft) or skips them (reviewed/rejected).
--   3. Agent ships the draft -> flagged pairs become 'shipped' and the
--      tenant can see them on their dashboard.
--
-- Adaptations vs. the generic draft (this repo's actual schema):
--   * applications links tenants via `applications.tenant_id` (FK
--     applications_tenant_id_fkey), not `user_id` — the tenant RLS policy
--     below uses tenant_id so it actually resolves.
--   * `applications.assigned_to` is the current agent FK. Policies let the
--     CURRENT assignee see/modify rows for their application, so a
--     reassigned agent inherits the previous agent's draft (matches the
--     existing reassignment-queue flow).
--   * The status-sync trigger is SECURITY DEFINER so the applications
--     update is not blocked by RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pair state table
-- ---------------------------------------------------------------------
create table if not exists public.application_property_matches (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  property_id     uuid not null references public.properties(id)   on delete cascade,
  agent_id        uuid not null references public.users(id)        on delete cascade,

  -- 'flagged' | 'skipped' | 'shipped'
  state           text not null check (state in ('flagged','skipped','shipped')),

  -- optional agent reason for skipping
  skip_reason     text,

  -- optional agent note, travels with a shipped match
  match_note      text,

  -- shipment bookkeeping
  shipped_at      timestamptz,
  shipped_by      uuid references public.users(id),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- one row per (application, property) pair; agent_id is recorded but not
  -- part of the uniqueness key, because a pair belongs to the agent
  -- currently working the application
  constraint application_property_matches_unique
    unique (application_id, property_id)
);

create index if not exists apm_application_idx
  on public.application_property_matches (application_id);
create index if not exists apm_property_idx
  on public.application_property_matches (property_id);
create index if not exists apm_agent_idx
  on public.application_property_matches (agent_id);
create index if not exists apm_state_idx
  on public.application_property_matches (application_id, state);

-- ---------------------------------------------------------------------
-- 2. updated_at trigger (namespaced helper to avoid clobbering shared ones)
-- ---------------------------------------------------------------------
create or replace function public.apm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists apm_touch_updated_at on public.application_property_matches;
create trigger apm_touch_updated_at
  before update on public.application_property_matches
  for each row execute function public.apm_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. Ship integrity: shipped rows must carry shipped_at + shipped_by
-- ---------------------------------------------------------------------
alter table public.application_property_matches
  drop constraint if exists apm_shipped_fields_ck;
alter table public.application_property_matches
  add constraint apm_shipped_fields_ck
  check (
    (state <> 'shipped')
    or (shipped_at is not null and shipped_by is not null)
  );

-- ---------------------------------------------------------------------
-- 4. No transition out of 'shipped' (hard guard, not just UI convention)
-- ---------------------------------------------------------------------
create or replace function public.apm_no_unshipped()
returns trigger
language plpgsql
as $$
begin
  if old.state = 'shipped' and new.state <> 'shipped' then
    raise exception 'Cannot move a shipped match back to %', new.state
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists apm_no_unshipped on public.application_property_matches;
create trigger apm_no_unshipped
  before update on public.application_property_matches
  for each row execute function public.apm_no_unshipped();

-- ---------------------------------------------------------------------
-- 5. Application-level working status (separate from status / assignment_status)
-- ---------------------------------------------------------------------
alter table public.applications
  add column if not exists agent_working_status text;

alter table public.applications
  drop constraint if exists applications_agent_working_status_ck;
alter table public.applications
  add constraint applications_agent_working_status_ck
  check (
    agent_working_status is null
    or agent_working_status in ('working','draft_complete','shipped','rejected')
  );

-- ---------------------------------------------------------------------
-- 6. Auto-maintain agent_working_status from pair-state changes.
--    SECURITY DEFINER so the applications write is not blocked by RLS.
--    Never downgrades a 'rejected' or 'shipped' application.
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
    count(*) filter (where state = 'shipped')
  into v_flag_n, v_ship_n
  from public.application_property_matches
  where application_id = v_app_id;

  -- never downgrade a shipped or rejected app back to working/draft_complete
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

drop trigger if exists apm_sync_status on public.application_property_matches;
create trigger apm_sync_status
  after insert or update or delete on public.application_property_matches
  for each row execute function public.apm_sync_application_status();

-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
alter table public.application_property_matches enable row level security;

drop policy if exists apm_agent_select on public.application_property_matches;
drop policy if exists apm_agent_insert on public.application_property_matches;
drop policy if exists apm_agent_update on public.application_property_matches;
drop policy if exists apm_agent_delete on public.application_property_matches;
drop policy if exists apm_tenant_read_shipped on public.application_property_matches;

-- Agent sees rows they set, or rows for an application currently assigned to
-- them (so a reassigned agent inherits the draft), plus admins.
create policy apm_agent_select on public.application_property_matches
  for select using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.assigned_to = auth.uid()
    )
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.user_type = 'admin'
    )
  );

create policy apm_agent_insert on public.application_property_matches
  for insert with check (
    agent_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.user_type = 'agent'
    )
  );

create policy apm_agent_update on public.application_property_matches
  for update using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.assigned_to = auth.uid()
    )
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.user_type = 'admin'
    )
  );

create policy apm_agent_delete on public.application_property_matches
  for delete using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.assigned_to = auth.uid()
    )
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.user_type = 'admin'
    )
  );

-- Tenant can read shipped rows for their own applications (applications.tenant_id)
create policy apm_tenant_read_shipped on public.application_property_matches
  for select using (
    state = 'shipped'
    and exists (
      select 1
      from public.applications a
      where a.id = application_property_matches.application_id
        and a.tenant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 8. Convenience view: current draft / shipped counts per application
-- ---------------------------------------------------------------------
create or replace view public.application_match_summary as
select
  m.application_id,
  m.agent_id,
  count(*) filter (where m.state = 'flagged') as flagged_count,
  count(*) filter (where m.state = 'skipped') as skipped_count,
  count(*) filter (where m.state = 'shipped') as shipped_count,
  max(m.shipped_at)                            as last_shipped_at
from public.application_property_matches m
group by m.application_id, m.agent_id;

-- Respect base-table RLS when the view is queried (Postgres 15+). Without this
-- the view runs with definer rights and could expose other applications' counts.
do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.application_match_summary set (security_invoker = true)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. RPC: ship all currently flagged pairs for an application (atomic)
-- ---------------------------------------------------------------------
create or replace function public.ship_flagged_matches(p_application_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent uuid := auth.uid();
  v_role  text;
  v_n     int;
begin
  select user_type into v_role from public.users where id = v_agent;

  if v_role not in ('agent','admin') then
    raise exception 'Not authorized to ship matches' using errcode = 'insufficient_privilege';
  end if;

  update public.application_property_matches
     set state      = 'shipped',
         shipped_at = now(),
         shipped_by = v_agent
   where application_id = p_application_id
     and state = 'flagged'
     and (v_role = 'admin' or agent_id = v_agent or exists (
           select 1 from public.applications a
           where a.id = p_application_id and a.assigned_to = v_agent
         ));

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.ship_flagged_matches(uuid) to authenticated;

notify pgrst, 'reload schema';
