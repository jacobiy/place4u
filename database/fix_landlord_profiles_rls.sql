-- ==============================================================================
-- Place4U: Enable Admin & Profile Access on landlord_profiles and agent_profiles
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure columns exist on landlord_profiles
ALTER TABLE public.landlord_profiles
  ADD COLUMN IF NOT EXISTS manage_with_platform BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS management_tier VARCHAR(50) NOT NULL DEFAULT 'full_management',
  ADD COLUMN IF NOT EXISTS application_status VARCHAR(50) NOT NULL DEFAULT 'not_applied',
  ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS ownership_doc_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS rates_taxes_doc_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS application_notes TEXT NULL;

-- 2. Drop restrictive single-user policies on landlord_profiles
DROP POLICY IF EXISTS "Landlords can view own profile" ON public.landlord_profiles;
DROP POLICY IF EXISTS "Landlords can insert own profile" ON public.landlord_profiles;
DROP POLICY IF EXISTS "Landlords can update own profile" ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_select_policy" ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_insert_policy" ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_update_policy" ON public.landlord_profiles;
DROP POLICY IF EXISTS "landlord_profiles_delete_policy" ON public.landlord_profiles;

-- 3. Create permissive policies for authenticated and anon clients (matching the rest of Place4U)
CREATE POLICY "allow_all_select_landlord_profiles"
  ON public.landlord_profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "allow_all_insert_landlord_profiles"
  ON public.landlord_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "allow_all_update_landlord_profiles"
  ON public.landlord_profiles
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_delete_landlord_profiles"
  ON public.landlord_profiles
  FOR DELETE
  TO public
  USING (true);

-- 4. Enable the same for agent_profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_profiles') THEN
    DROP POLICY IF EXISTS "allow_all_select_agent_profiles" ON public.agent_profiles;
    DROP POLICY IF EXISTS "allow_all_insert_agent_profiles" ON public.agent_profiles;
    DROP POLICY IF EXISTS "allow_all_update_agent_profiles" ON public.agent_profiles;
    DROP POLICY IF EXISTS "allow_all_delete_agent_profiles" ON public.agent_profiles;

    CREATE POLICY "allow_all_select_agent_profiles" ON public.agent_profiles FOR SELECT TO public USING (true);
    CREATE POLICY "allow_all_insert_agent_profiles" ON public.agent_profiles FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "allow_all_update_agent_profiles" ON public.agent_profiles FOR UPDATE TO public USING (true) WITH CHECK (true);
    CREATE POLICY "allow_all_delete_agent_profiles" ON public.agent_profiles FOR DELETE TO public USING (true);
  END IF;
END $$;

-- 5. Seed landlord_profiles rows for existing landlords if they do not exist
INSERT INTO public.landlord_profiles (
  user_id,
  landlord_code,
  full_name,
  email,
  phone,
  application_status,
  account_status,
  id_verified,
  ownership_proof_verified,
  created_at,
  updated_at
)
SELECT
  u.id,
  'LD-' || UPPER(SUBSTRING(u.id::text, 1, 6)),
  COALESCE(u.full_name, 'Landlord'),
  u.email,
  u.phone,
  CASE WHEN u.is_verified THEN 'approved' ELSE 'pending_review' END,
  CASE WHEN u.is_verified THEN 'active' ELSE 'pending' END,
  COALESCE(u.is_verified, false),
  COALESCE(u.is_verified, false),
  COALESCE(u.created_at, now()),
  now()
FROM public.users u
WHERE u.user_type = 'landlord'
ON CONFLICT (user_id) DO UPDATE
SET
  application_status = EXCLUDED.application_status,
  account_status = EXCLUDED.account_status,
  id_verified = EXCLUDED.id_verified,
  ownership_proof_verified = EXCLUDED.ownership_proof_verified,
  updated_at = now();

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload schema';
