-- ==============================================================================
-- Place4U: Public read access for approved property listings
-- ------------------------------------------------------------------------------
-- The marketing landing page reads live listings with the ANONYMOUS (anon) key.
-- Even if row level security is enabled on public.properties, anon needs a
-- permissive SELECT policy for approved + active listings, otherwise the landing
-- page falls back to its built-in sample cards.
--
-- This migration is ADDITIVE and safe to re-run:
--   * It never enables or disables RLS on public.properties.
--   * If RLS is OFF, the policy below is a harmless no-op (the table is already
--     readable) and the GRANT still applies.
--   * If RLS is ON, this adds a permissive SELECT policy for `anon` and
--     `authenticated` that exposes only live, approved listings. Existing
--     policies (landlord owner access, admin access, etc.) keep working, because
--     permissive policies are OR'd together.
--
-- Depends on database/property_approval_schema.sql for the `approval_status`
-- column. If that column is missing this script still succeeds and simply keys
-- the policy off `is_active` alone.
--
-- Run this in your Supabase SQL Editor:
--   https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'approval_status'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS properties_public_read_approved ON public.properties;
      CREATE POLICY properties_public_read_approved
        ON public.properties
        FOR SELECT
        TO anon, authenticated
        USING (is_active IS TRUE AND approval_status = 'approved');
    $policy$;
  ELSE
    -- Pre-approval environments: fall back to the legacy is_active flag.
    EXECUTE $policy$
      DROP POLICY IF EXISTS properties_public_read_approved ON public.properties;
      CREATE POLICY properties_public_read_approved
        ON public.properties
        FOR SELECT
        TO anon, authenticated
        USING (is_active IS TRUE);
    $policy$;
  END IF;
END $$;

-- Ensure the API roles can read the table at the privilege level too.
GRANT SELECT ON public.properties TO anon, authenticated;

-- ==============================================================================
-- Verify: this should return the approved + active listings the landing page
-- shows. (Run while impersonating the `anon` role, or from the SQL editor.)
-- ==============================================================================
-- SELECT id, property_type, area, city, price, image_urls
-- FROM public.properties
-- WHERE is_active IS TRUE AND approval_status = 'approved'
-- ORDER BY created_at DESC
-- LIMIT 12;
