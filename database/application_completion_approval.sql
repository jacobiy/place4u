-- =====================================================================
-- Place4U: Application Completion Approval Workflow
--
-- Enforces that an Agent cannot unilaterally set status = 'completed'
-- to claim their R50 commission share. Instead:
--   1. The Agent requests completion review once placement is finalized.
--   2. The Administrator reviews the file (e.g. lease signed) and approves it.
--   3. Only Admin approval sets status = 'completed', unlocking the R50 share.
--
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add completion review tracking columns on public.applications
-- ---------------------------------------------------------------------
alter table public.applications
  add column if not exists completion_requested_at timestamptz,
  add column if not exists completion_request_note text,
  add column if not exists completion_approved_at  timestamptz,
  add column if not exists completion_approved_by  uuid references public.users(id) on delete set null,
  add column if not exists completion_approved_note text;

create index if not exists idx_applications_completion_req
  on public.applications(completion_requested_at)
  where status <> 'completed';

-- ---------------------------------------------------------------------
-- 2. RPC: Agent requests completion approval
-- ---------------------------------------------------------------------
drop function if exists public.agent_request_completion;
create or replace function public.agent_request_completion(
  p_application_id uuid,
  p_note           text default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications;
begin
  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;

  if (v_app.assigned_to is distinct from auth.uid()) and not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type in ('admin','agent')
  ) then
    raise exception 'Only the assigned agent or admin can request completion'
      using errcode = 'insufficient_privilege';
  end if;

  if v_app.status = 'completed' then
    return v_app;
  end if;

  update public.applications
     set completion_requested_at = now(),
         completion_request_note = p_note
   where id = p_application_id
   returning * into v_app;

  return v_app;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. RPC: Admin officially approves completion
-- ---------------------------------------------------------------------
drop function if exists public.admin_approve_completion;
create or replace function public.admin_approve_completion(
  p_application_id uuid,
  p_note           text default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications;
begin
  if not exists (
    select 1 from public.users u where u.id = auth.uid() and u.user_type = 'admin'
  ) then
    raise exception 'Only administrators can approve application completion'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;

  update public.applications
     set status                   = 'completed',
         completion_approved_at   = now(),
         completion_approved_by   = auth.uid(),
         completion_approved_note = coalesce(p_note, completion_approved_note)
   where id = p_application_id
   returning * into v_app;

  return v_app;
end;
$$;

grant execute on function public.agent_request_completion(uuid, text) to authenticated, anon;
grant execute on function public.admin_approve_completion(uuid, text) to authenticated, anon;

notify pgrst, 'reload schema';
