-- ============================================================================
-- Place4U: Agent Profile & Onboarding Verification Schema
-- Run this in your Supabase SQL Editor to support the agent activation workflow.
-- ============================================================================

-- 1. Create agent_profiles table if it does not already exist
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Personal & Contact Information
  full_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  id_number VARCHAR(50) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,

  -- Professional Credentials
  agency_name VARCHAR(255) NULL,
  experience_years INTEGER DEFAULT 0,
  tax_number VARCHAR(100) NULL,
  fidelity_fund_cert_url TEXT NULL,

  -- Document Verification Uploads (FICA)
  id_document_url TEXT NULL,
  proof_of_residence_url TEXT NULL,
  additional_documents JSONB DEFAULT '[]'::jsonb,

  -- Verification & Interview Workflow State
  is_verified BOOLEAN NOT NULL DEFAULT false, -- True once interview passed & documents approved
  verification_status VARCHAR(50) NOT NULL DEFAULT 'not_applied', 
  -- Allowed statuses: 'not_applied', 'pending_review', 'interview_scheduled', 'verified', 'rejected'
  
  -- Interview Details
  interview_date TIMESTAMPTZ NULL,
  interview_time_slot VARCHAR(50) NULL,
  preferred_contact_method VARCHAR(50) DEFAULT 'whatsapp',
  interview_notes TEXT NULL,
  rejection_reason TEXT NULL,

  -- Timestamps
  submitted_at TIMESTAMPTZ NULL,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON public.agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_is_verified ON public.agent_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_verification_status ON public.agent_profiles(verification_status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

-- Agents can view their own profile
DROP POLICY IF EXISTS "Agents can view own profile" ON public.agent_profiles;
CREATE POLICY "Agents can view own profile"
  ON public.agent_profiles FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'
  ));

-- Agents can insert their own profile
DROP POLICY IF EXISTS "Agents can insert own profile" ON public.agent_profiles;
CREATE POLICY "Agents can insert own profile"
  ON public.agent_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Agents can update their own profile; admins can update any profile (e.g. verify/schedule)
DROP POLICY IF EXISTS "Agents can update own profile" ON public.agent_profiles;
CREATE POLICY "Agents can update own profile"
  ON public.agent_profiles FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'
  ));

-- 4. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_agent_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER trigger_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_agent_profiles_updated_at();

-- 5. Helper view to inspect agent verification queue
CREATE OR REPLACE VIEW public.agent_verification_queue AS
SELECT 
  ap.id AS profile_id,
  ap.user_id,
  u.full_name,
  u.email,
  u.phone,
  ap.id_number,
  ap.agency_name,
  ap.is_verified,
  ap.verification_status,
  ap.submitted_at,
  ap.interview_date,
  ap.id_document_url,
  ap.proof_of_residence_url
FROM public.agent_profiles ap
JOIN public.users u ON u.id = ap.user_id
ORDER BY ap.submitted_at DESC NULLS LAST;
