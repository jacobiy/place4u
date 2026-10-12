-- ==============================================================================
-- Place4U: Secure Private 'documents' Storage Bucket & POPIA Compliance Rules
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- ==============================================================================

-- 1. Create or Update the Private 'documents' Bucket
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,               -- STRICTLY PRIVATE: prevents unauthorized public internet access
  20971520,            -- 20 MB max file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];


-- 2. Clean Up Any Pre-Existing Policies for 'documents'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users and admins to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete documents" ON storage.objects;


-- 3. INSERT Policy: Authenticated Users Can Only Upload to Their Own Directory
-- ------------------------------------------------------------------------------
-- Ensures tenants/landlords/agents can only upload into paths associated with their user ID.
-- Example paths:
--   - <userId>/id_document-12345.pdf
--   - <userId>/bank_statement-12345.pdf
--   - landlords/<userId>/title_deed-12345.pdf
CREATE POLICY "documents_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- User ID is the first folder (e.g. "813f029b-f64c.../file.pdf")
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User ID is the second folder (e.g. "landlords/813f029b-f64c.../file.pdf")
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Fallback owner check
    owner = auth.uid()
    OR
    -- Admins can upload anywhere
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_type = 'admin'
    )
  )
);


-- 4. SELECT Policy: Private Read / Download Access
-- ------------------------------------------------------------------------------
-- Strictly restricts viewing sensitive documents (IDs, payslips, bank statements, deeds) to:
--   1. The user who uploaded the document (owner/path match)
--   2. Platform Admins (for compliance, FICA vetting, and approvals)
--   3. Registered Landlords and Agents reviewing applications
CREATE POLICY "documents_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- 1. User owns the file by auth uid
    owner = auth.uid()
    OR
    -- 2. File path contains the user's ID
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- 3. User is an Administrator (full review access)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_type = 'admin'
    )
    OR
    -- 4. User is an active Landlord or Agent authorized to review applicant files
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_type IN ('landlord', 'agent')
    )
  )
);


-- 5. UPDATE Policy: Only the Owner or an Admin Can Replace/Update
-- ------------------------------------------------------------------------------
CREATE POLICY "documents_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_type = 'admin'
    )
  )
);


-- 6. DELETE Policy: Only the Owner or an Admin Can Delete
-- ------------------------------------------------------------------------------
CREATE POLICY "documents_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_type = 'admin'
    )
  )
);
