-- ============================================================================
-- Place4U: Security hardening
-- Run in the Supabase SQL editor (or a migration).
--
-- Context: the admin gate is enforced in the browser (src/component/
-- ProtectedRoute.jsx) and now resolves the role ONLY from public.users. These
-- scripts close the *data-layer* gaps so that the browser check is defence in
-- depth, not the only control:
--
--   Part A  Guard writes to users.user_type / is_verified  (APPLY NOW, safe)
--   Part B  Row Level Security on public.users             (RECOMMENDED; needs
--                                                          app read changes —
--                                                          see the warning)
--   Part C  Restore owner-scoped RLS on profile tables     (APPLY NOW)
--   Part D  user_directory view for cross-user reads       (support for Part B)
--
-- The RPC gap (public.admin_dashboard_overview) is fixed in
-- src/pages/admin/db/admin.sql.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Shared predicate: is the caller an active platform admin?
-- SECURITY DEFINER so it can read users regardless of RLS. Returns false for
-- everyone else, including anon, so it is safe to expose.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and user_type = 'admin'
      and coalesce(is_verified, true) = true
  );
$$;

grant execute on function public.is_admin() to public;


-- ============================================================================
-- PART A — Prevent client-side privilege escalation (APPLY NOW)
--
-- The signup form lets the client choose user_type, and the users row is
-- inserted straight from the browser with the public key. Without this guard a
-- user can POST user_type='admin' (or flip their own is_verified) and walk
-- straight into the admin console. Trusted contexts (service role, SQL editor,
-- server jobs) have no JWT subject and are left untouched.
-- ============================================================================
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_is_admin boolean := false;
begin
  if actor is not null then
    actor_is_admin := exists (
      select 1 from public.users u
      where u.id = actor and u.user_type = 'admin'
    );
  end if;

  -- Trusted / server-side context: no authenticated user on the request.
  if actor is null or actor_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_type = 'admin' then
      raise exception 'Cannot self-register as an administrator'
        using errcode = '42501';
    end if;
    if new.is_verified is true then
      raise exception 'A new account cannot be self-verified'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: a non-admin actor may edit their own profile fields (name, phone,
  -- …) but may never change their role or verification status.
  if new.user_type is distinct from old.user_type then
    raise exception 'Only administrators can change a user role'
      using errcode = '42501';
  end if;

  if new.is_verified is distinct from old.is_verified then
    raise exception 'Only administrators can change verification status'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_user_privileges on public.users;
create trigger trg_guard_user_privileges
  before insert or update on public.users
  for each row execute function public.guard_user_privileges();

-- Make sure any existing admins are marked verified, otherwise the client gate
-- (user_type='admin' AND is_verified <> false) and is_admin() will deny them.
update public.users set is_verified = true
where user_type = 'admin' and is_verified is distinct from true;


-- ============================================================================
-- PART B — Row Level Security on public.users (RECOMMENDED)
--
-- ⚠ COMPATIBILITY WARNING — READ BEFORE APPLYING.
-- The app currently does CROSS-USER reads of `users` with the public key in
-- several places, e.g.:
--   • messaging conversation lists (Tenant/Landlord/Agent db/queries.js,
--     `.in('user_type', [...])`)
--   • job / application joins (admin + agent queries)
-- Enabling the strict policies below will BLOCK those reads until the app is
-- pointed at the `user_directory` view (Part D) for any non-self / non-admin
-- access. Apply this part together with the Part D app change, ideally in a
-- staging project first.
-- ============================================================================
alter table public.users enable row level security;

-- A user can read their own row; admins can read every row.
drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Self-registration: a new row must be the caller's own id, and may only be a
-- non-admin role. (Part A's trigger enforces this again at the row level.)
drop policy if exists "users_insert_self_non_admin" on public.users;
create policy "users_insert_self_non_admin"
  on public.users for insert
  to authenticated
  with check (
    id = auth.uid()
    and user_type in ('tenant', 'landlord', 'agent')
  );

-- A user may update their own row; admins may update any row. The trigger from
-- Part A stops a non-admin from touching user_type / is_verified.
drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
  on public.users for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Deletes are admin-only.
drop policy if exists "users_delete_admin_only" on public.users;
create policy "users_delete_admin_only"
  on public.users for delete
  to authenticated
  using (public.is_admin());


-- ============================================================================
-- PART C — Restore owner-scoped RLS on profile tables (APPLY NOW)
--
-- database/fix_landlord_profiles_rls.sql replaced the owner policies with
-- `USING (true)` / `WITH CHECK (true)` for role `public`, exposing every
-- landlord/agent profile (including document URLs) to anyone holding the
-- public key. This reinstates owner + admin access.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'landlord_profiles') then
    drop policy if exists "allow_all_select_landlord_profiles" on public.landlord_profiles;
    drop policy if exists "allow_all_insert_landlord_profiles" on public.landlord_profiles;
    drop policy if exists "allow_all_update_landlord_profiles" on public.landlord_profiles;
    drop policy if exists "allow_all_delete_landlord_profiles" on public.landlord_profiles;

    drop policy if exists "landlord_profiles_owner_select" on public.landlord_profiles;
    drop policy if exists "landlord_profiles_owner_insert" on public.landlord_profiles;
    drop policy if exists "landlord_profiles_owner_update" on public.landlord_profiles;
    drop policy if exists "landlord_profiles_owner_delete" on public.landlord_profiles;

    create policy "landlord_profiles_owner_select" on public.landlord_profiles
      for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
    create policy "landlord_profiles_owner_insert" on public.landlord_profiles
      for insert to authenticated
      with check (user_id = auth.uid() or public.is_admin());
    create policy "landlord_profiles_owner_update" on public.landlord_profiles
      for update to authenticated
      using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
    create policy "landlord_profiles_owner_delete" on public.landlord_profiles
      for delete to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'agent_profiles') then
    drop policy if exists "allow_all_select_agent_profiles" on public.agent_profiles;
    drop policy if exists "allow_all_insert_agent_profiles" on public.agent_profiles;
    drop policy if exists "allow_all_update_agent_profiles" on public.agent_profiles;
    drop policy if exists "allow_all_delete_agent_profiles" on public.agent_profiles;

    drop policy if exists "agent_profiles_owner_select" on public.agent_profiles;
    drop policy if exists "agent_profiles_owner_insert" on public.agent_profiles;
    drop policy if exists "agent_profiles_owner_update" on public.agent_profiles;
    drop policy if exists "agent_profiles_owner_delete" on public.agent_profiles;

    create policy "agent_profiles_owner_select" on public.agent_profiles
      for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
    create policy "agent_profiles_owner_insert" on public.agent_profiles
      for insert to authenticated
      with check (user_id = auth.uid() or public.is_admin());
    create policy "agent_profiles_owner_update" on public.agent_profiles
      for update to authenticated
      using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
    create policy "agent_profiles_owner_delete" on public.agent_profiles
      for delete to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;
end $$;


-- ============================================================================
-- PART D — user_directory view (support for Part B)
--
-- Minimal, non-sensitive projection of users for the cross-user reads the app
-- needs (messaging recipients, job joins). Exposes NO email/phone/PII. The view
-- intentionally runs with the owner's rights (default security_invoker=false)
-- so it is readable by authenticated users even after Part B locks down
-- public.users — this is safe precisely because the projection is curated.
-- Point the messaging / lookup queries at this view, then apply Part B.
-- ============================================================================
drop view if exists public.user_directory;
create view public.user_directory
as
select id, full_name, user_type, is_verified
from public.users;

grant select on public.user_directory to authenticated;


-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
