-- ==============================================================================
-- Place4U: Landlord occupancy + resident (tenant) records
--
-- The Landlord module reads/writes property occupancy and resident records:
--   * public.properties.occupied / public.properties.tenants
--   * public.tenants (a landlord's active residents)
--
-- Neither the columns nor the table exist yet, so "Approve & Assign Tenant"
-- and the "Occupied / Vacant" UI silently failed. Run this in the Supabase
-- SQL Editor to enable them.
-- ==============================================================================

-- 1. Occupancy flags on listings --------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS occupied BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenants JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.occupied
  IS 'Whether the unit currently has an active resident';
COMMENT ON COLUMN public.properties.tenants
  IS 'Display names of active residents on this unit (JSONB array)';

-- 2. Residents --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id    UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  full_name      TEXT,
  email          TEXT,
  phone          TEXT,
  rent           NUMERIC(12,2),
  lease_status   TEXT NOT NULL DEFAULT 'Active',
  lease_start    DATE,
  lease_end      DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_landlord ON public.tenants(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property ON public.tenants(property_id);

-- 3. Row level security -----------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- A landlord owns (and may fully manage) their own resident records.
DROP POLICY IF EXISTS "tenants_landlord_manage" ON public.tenants;
CREATE POLICY "tenants_landlord_manage"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Admins can review any resident record.
DROP POLICY IF EXISTS "tenants_admin_read" ON public.tenants;
CREATE POLICY "tenants_admin_read"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

-- Agents can read resident records (they own the screening relationship).
DROP POLICY IF EXISTS "tenants_agent_read" ON public.tenants;
CREATE POLICY "tenants_agent_read"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.user_type = 'agent'
    )
  );
