-- Admin UI support objects (Supabase/Postgres).
-- Apply in Supabase SQL editor or migrations if you want an RPC powering the admin pages.

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql
security definer
as $admin_dashboard_overview$
declare
  payload jsonb;
begin
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
            'status', coalesce(u.status, 'active'),
            'created_at', u.created_at
          )
          order by u.created_at desc
        )
        from (
          select id, full_name, user_type, status, created_at
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
