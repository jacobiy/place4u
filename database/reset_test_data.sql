-- =============================================================================
--  Place4U - RESET: remove all dummy / test data before production
-- =============================================================================
--  Run in:  Supabase Dashboard -> SQL Editor -> New query
--           https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--  Run as:  the project owner (postgres / service role).
--
--  WHAT THIS DOES
--    1. Empties every transactional table (identities reset; CASCADE follows
--       foreign keys, so dependent rows go too).
--    2. Deletes the matching test auth accounts from auth.users.
--    3. Clears uploaded files. NOTE: this is NOT done in SQL (Supabase blocks
--       direct deletes on storage.objects) - use scripts/clear-storage-buckets.mjs.
--
--  WHAT THIS LEAVES ALONE
--    - All schema: tables, columns, constraints, indexes, sequences.
--    - RLS policies, triggers (incl. guard_user_privileges), functions, views.
--    - storage.buckets rows (bucket *configuration* is not data).
--
--  CONFIGURED FOR A FULL RESET: NO accounts are kept (admins included).
--  Storage is cleared separately via scripts/clear-storage-buckets.mjs.
--  Recreate your admin account afterwards.
--
--  !! IRREVERSIBLE. Read CONFIG 1 and CONFIG 3 below before running.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- CONFIG 1 - which ACCOUNTS to keep
--   CONFIGURED FOR A FULL WIPE: `where false` keeps nobody, so EVERY account
--   (admins included) is deleted. Recreate your admin account afterwards.
--   To keep accounts instead, use e.g.:
--       where user_type = 'admin'
--       where user_type = 'admin' or email in ('you@place4u.xyz')
-- -----------------------------------------------------------------------------
create temporary table _keep_accounts on commit drop as
select *
from public.users
where false;

do $$
begin
  raise notice 'Accounts to keep: %', (select count(*) from _keep_accounts);
  if (select count(*) from _keep_accounts) = 0 then
    raise warning 'No accounts will be kept - ALL users (including admins) will be deleted.';
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- CONFIG 2 - TRANSACTIONAL TABLES to empty
--   Guarded with to_regclass, so tables that do not exist in your project are
--   skipped instead of erroring. TRUNCATE ... RESTART IDENTITY CASCADE also
--   resets id sequences and clears rows in any table that references these.
--   ('users' is intentionally LAST: truncating it cascades to every table that
--    references it, so it catches anything not explicitly listed here.)
-- -----------------------------------------------------------------------------
do $$
declare
  tbl text;
  targets text[] := array[
    -- matching / workflow
    'application_property_matches',
    'match_events',
    -- core tenant "job" + money
    'applications',
    'payments',
    'agent_payout_requests',
    'tenants',
    -- messaging
    'messages',
    'direct_messages',
    -- activity logs (best effort - skipped if absent)
    'tenant_activity_log',
    'landlord_activity_log',
    -- profiles / settings
    'tenant_settings',
    'tenant_profiles',
    'agent_profiles',
    'landlord_profiles',
    'profiles',
    -- uploaded-document metadata
    'documents',
    -- inventory
    'properties',
    -- accounts (last, cascades to anything remaining that references users)
    'users'
  ];
begin
  foreach tbl in array targets loop
    if to_regclass('public.' || tbl) is not null then
      execute format('truncate table public.%I restart identity cascade', tbl);
      raise notice 'TRUNCATE  public.%', tbl;
    else
      raise notice 'SKIP      public.%  (not present)', tbl;
    end if;
  end loop;
end $$;

-- Restore the accounts we chose to keep (truncated above). The
-- guard_user_privileges BEFORE INSERT trigger allows this: in the SQL editor
-- there is no JWT subject, so it treats the request as a trusted context.
-- If public.users.id were a GENERATED ALWAYS identity column (it is a plain
-- uuid keyed to auth.users here, so normally not), this insert would need
-- `overriding system value`.
insert into public.users
select * from _keep_accounts
on conflict (id) do nothing;

-- Remove the test auth accounts so they cannot sign in again and get silently
-- re-provisioned (AuthCallback bootstraps a missing public.users row as
-- 'tenant', which would resurrect a deleted account with the wrong role).
delete from auth.users a
where not exists (select 1 from _keep_accounts k where k.id = a.id);


-- -----------------------------------------------------------------------------
-- CONFIG 3 - STORAGE (uploaded files)  [handled OUTSIDE SQL]
--   A direct `delete from storage.objects` FAILS on current Supabase:
--     42501: Direct deletion from storage tables is not allowed.
--     CONTEXT: storage.protect_delete()
--   This protects against orphaned files, so storage must be cleared through
--   the Storage API. Use the companion script:
--       node scripts/clear-storage-buckets.mjs
--   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment), or
--   Dashboard -> Storage -> bucket -> select all -> delete.
-- -----------------------------------------------------------------------------
-- delete from storage.objects
-- where bucket_id in (
--   'documents', 'landlord-documents', 'agent-documents',
--   'profiles', 'agent-profiles', 'properties'
-- );

commit;


-- =============================================================================
--  VERIFY (run after COMMIT)
--  If your project is missing any table below, delete that union branch first.
-- =============================================================================
select 'users'                  as table_name, count(*) as rows from public.users
union all select 'properties',            count(*) from public.properties
union all select 'applications',          count(*) from public.applications
union all select 'payments',              count(*) from public.payments
union all select 'agent_payout_requests', count(*) from public.agent_payout_requests
union all select 'tenants',               count(*) from public.tenants
union all select 'messages',              count(*) from public.messages
union all select 'documents',             count(*) from public.documents
union all select 'landlord_profiles',     count(*) from public.landlord_profiles
union all select 'agent_profiles',        count(*) from public.agent_profiles
union all select 'tenant_profiles',       count(*) from public.tenant_profiles
order by table_name;

-- If you ever re-enable the CONFIG 1 keep-list and a kept profile goes missing:
--   select id, email, user_type from public.users order by user_type, email;
