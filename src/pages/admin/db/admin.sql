-- Admin UI support objects (Supabase/Postgres).
-- Apply in Supabase SQL editor or migrations if you want an RPC powering the admin pages.

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $admin_dashboard_overview$
declare
  payload jsonb;
begin
  -- SECURITY DEFINER bypasses RLS, so the admin gate MUST live here. Without
  -- this check any client (including anon with the public key) could call this
  -- RPC and read user data.
  if not exists (
    select 1
    from public.users
    where id = auth.uid()
      and user_type = 'admin'
      and coalesce(is_verified, true) = true
  ) then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  payload := jsonb_build_object(
    'stats', jsonb_build_object(
      'totalUsers', (select count(*) from public.users),
      'totalLandlords', (select count(*) from public.users where user_type = 'landlord'),
      'totalTenants', (select count(*) from public.users where user_type = 'tenant'),
      'totalAgents', (select count(*) from public.users where user_type = 'agent')
    ),
    'recentUsers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', u.id,
            'name', coalesce(u.full_name, 'Unknown'),
            'type', coalesce(u.user_type, 'User'),
            'status', case when u.is_verified then 'verified' else 'pending' end,
            'created_at', u.created_at
          )
          order by u.created_at desc
        )
        from (
          select id, full_name, user_type, is_verified, created_at
          from public.users
          order by created_at desc
          limit 5
        ) u
      ),
      '[]'::jsonb
    )
  );

  return payload;
end;
$admin_dashboard_overview$;

-- Only authenticated users may even reach the guard above. Anonymous callers
-- are rejected before execution, and the guard rejects non-admins.
revoke all on function public.admin_dashboard_overview() from public, anon;
grant execute on function public.admin_dashboard_overview() to authenticated;
