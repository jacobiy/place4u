-- ============================================================================
-- Place4U: Landlord Profile Application & Portfolio Management Schema Update
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- 1. Ensure required columns exist on public.landlord_profiles
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

-- 2. Add helpful constraints (safely handled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_landlord_application_status'
  ) THEN
    ALTER TABLE public.landlord_profiles
      ADD CONSTRAINT valid_landlord_application_status CHECK (
        application_status IN ('not_applied', 'pending_review', 'approved', 'rejected')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_management_tier'
  ) THEN
    ALTER TABLE public.landlord_profiles
      ADD CONSTRAINT valid_management_tier CHECK (
        management_tier IN ('listing_only', 'full_management')
      );
  END IF;
END $$;

-- 3. Indexes for swift verification lookups
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_app_status ON public.landlord_profiles(application_status);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_manage_mode ON public.landlord_profiles(manage_with_platform);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_app_submitted ON public.landlord_profiles(application_submitted_at);

-- 4. Set RLS policy allowing landlords to update their own profile & application
-- (In case RLS is active)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'landlord_profiles') THEN
    ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Landlords can view own profile" ON public.landlord_profiles;
CREATE POLICY "Landlords can view own profile"
  ON public.landlord_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Landlords can insert own profile" ON public.landlord_profiles;
CREATE POLICY "Landlords can insert own profile"
  ON public.landlord_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Landlords can update own profile" ON public.landlord_profiles;
CREATE POLICY "Landlords can update own profile"
  ON public.landlord_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
