-- ==============================================================================
-- Place4U: Agent Job Acceptance / Rejection
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- Flow this enables:
--   1. Admin assigns a tenant application ("job") to an agent  -> assignment_status = 'assigned'
--   2. Agent opens their Assigned Applications and either:
--        Accept  -> assignment_status = 'accepted'
--        Reject  -> assignment_status = 'rejected' (+ assignment_rejection_reason)
--   3. The admin portal surfaces the response and flags rejected jobs as
--      "needs reassignment" so the admin can assign a different agent.
--
-- Reassigning a job to a different agent automatically resets the response
-- back to 'assigned' (see trigger below), so the new agent gets a fresh
-- Accept / Reject prompt and the previous rejection is cleared.
--
-- This migration is additive and idempotent: safe to run on a fresh database
-- or an existing one. It never drops data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add the assignment-response columns
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS assignment_status text,
  ADD COLUMN IF NOT EXISTS assignment_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_rejection_reason text;

-- ------------------------------------------------------------------------------
-- 2. Backfill existing rows so nothing is left NULL
-- ------------------------------------------------------------------------------
UPDATE public.applications
SET assignment_status = CASE
      WHEN assigned_to IS NULL THEN 'unassigned'
      WHEN status = 'under_review' THEN 'assigned'
      ELSE 'assigned'
    END
WHERE assignment_status IS NULL;

UPDATE public.applications
SET assignment_assigned_at = COALESCE(assignment_assigned_at, submitted_at, now())
WHERE assigned_to IS NOT NULL
  AND assignment_assigned_at IS NULL;

-- ------------------------------------------------------------------------------
-- 3. Default + NOT NULL + allowed-value constraint
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications
  ALTER COLUMN assignment_status SET DEFAULT 'unassigned';

ALTER TABLE public.applications
  ALTER COLUMN assignment_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_assignment_status_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_assignment_status_check
      CHECK (assignment_status IN ('unassigned', 'assigned', 'accepted', 'rejected'));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Trigger: keep assignment_status in sync with assigned_to
--    Explicit Accept/Reject writes (which do not change assigned_to) are
--    preserved; reassignment or unassignment resets the response.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_application_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.assignment_status := 'assigned';
      NEW.assignment_assigned_at := COALESCE(NEW.assignment_assigned_at, now());
    ELSIF NEW.assignment_status IS NULL OR NEW.assignment_status = 'assigned' THEN
      NEW.assignment_status := 'unassigned';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    NEW.assignment_responded_at := NULL;
    NEW.assignment_rejection_reason := NULL;
    IF NEW.assigned_to IS NULL THEN
      NEW.assignment_status := 'unassigned';
      NEW.assignment_assigned_at := NULL;
    ELSE
      NEW.assignment_status := 'assigned';
      NEW.assignment_assigned_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_application_assignment ON public.applications;
CREATE TRIGGER trg_sync_application_assignment
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_application_assignment();

-- ------------------------------------------------------------------------------
-- 5. Index for the admin "needs reassignment" queue
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_assignment_status
  ON public.applications (assignment_status);

-- ------------------------------------------------------------------------------
-- 6. RLS: let an agent update the assignment response on jobs assigned to them.
--    Policies are permissive (OR-ed), so this only widens access for agents on
--    their own assignments and never restricts existing policies.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND policyname = 'applications_agent_respond_to_assignment'
  ) THEN
    CREATE POLICY applications_agent_respond_to_assignment
      ON public.applications
      FOR UPDATE
      TO authenticated
      USING (assigned_to = auth.uid())
      WITH CHECK (assigned_to = auth.uid());
  END IF;
END $$;
