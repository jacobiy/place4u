-- ==============================================================================
-- Place4U: Property listing approval workflow
-- Adds a landlord listing lifecycle to public.properties:
--
--   draft -> pending_approval -> approved | rejected
--
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. New columns.
--    NOTE: approval_status defaults to 'approved' so every EXISTING listing
--    stays live. New landlord-created listings explicitly set 'draft' or
--    'pending_approval' from the app, so they are correctly gated.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(24) NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL;

-- 2. Constrain the allowed lifecycle values.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_approval_status_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_approval_status_check
  CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- 3. Index for the admin review queue.
CREATE INDEX IF NOT EXISTS idx_properties_approval_status
  ON public.properties(approval_status);

-- 4. Documentation.
COMMENT ON COLUMN public.properties.approval_status
  IS 'Listing lifecycle: draft, pending_approval, approved, or rejected';
COMMENT ON COLUMN public.properties.approval_notes
  IS 'Reviewer feedback shown to the landlord (e.g. rejection reason)';
COMMENT ON COLUMN public.properties.documents
  IS 'Property-scoped verification documents (JSONB array of metadata objects)';
COMMENT ON COLUMN public.properties.submitted_at
  IS 'When the landlord submitted the listing for approval';
COMMENT ON COLUMN public.properties.reviewed_at
  IS 'When an admin approved or rejected the listing';
COMMENT ON COLUMN public.properties.reviewed_by
  IS 'Admin user id that actioned the review';

-- ==============================================================================
-- Storage: allow authenticated landlords to upload property documents to the
-- existing 'landlord-documents' bucket under a properties/<property_id>/ folder.
-- (The bucket + base policies are created in landlord_documents_bucket.sql.)
-- ==============================================================================
DROP POLICY IF EXISTS "landlord_documents_property_insert" ON storage.objects;
CREATE POLICY "landlord_documents_property_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landlord-documents'
  AND (storage.foldername(name))[1] = 'properties'
);

DROP POLICY IF EXISTS "landlord_documents_property_delete" ON storage.objects;
CREATE POLICY "landlord_documents_property_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (storage.foldername(name))[1] = 'properties'
);
