-- ==============================================================================
-- Place4U: Landlord Documents & Proof of Ownership Storage Bucket
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- POPIA: this bucket holds proof of ownership, rates accounts and ID documents.
-- It is intentionally PRIVATE (public = false). Anonymous visitors can never
-- read these files; access is granted only to the owning landlord and to
-- administrators (for verification), via short-lived signed URLs.
--
-- If you previously ran an earlier version of this file the bucket was public.
-- Re-running this script flips it to private and replaces the permissive
-- policies, so no anonymous `/object/public/...` link keeps working.
-- ==============================================================================

-- 1. Create or Update the 'landlord-documents' Storage Bucket (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landlord-documents',
  'landlord-documents',
  false,               -- PRIVATE: no anonymous / public-object reads
  20971520,            -- 20 MB max file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- 2. Drop every current policy for this bucket so we never leave a public one
--    behind (older installs created a blanket "anyone can select" policy).
DROP POLICY IF EXISTS "landlord_documents_public_select" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_delete" ON storage.objects;

-- Object paths in this bucket are either:
--   ownership-docs/<userId>/<file>      (profile proof-of-ownership / FICA)
--   properties/<propertyId>/<file>      (per-listing proof of ownership)
-- so "ownership" is the userId folder for profile docs, or a property the
-- requesting landlord actually owns for listing docs.

-- 3. SELECT: the owning landlord may read their own documents.
CREATE POLICY "landlord_documents_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (
    ((storage.foldername(name))[1] = 'ownership-docs' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'properties' AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.landlord_id = auth.uid()
    ))
    OR owner = auth.uid()
  )
);

-- 4. SELECT: administrators may read any document (verification workflow).
CREATE POLICY "landlord_documents_admin_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.user_type = 'admin'
  )
);

-- 5. INSERT: a landlord may only upload into their own folder / listings.
CREATE POLICY "landlord_documents_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landlord-documents'
  AND (
    ((storage.foldername(name))[1] = 'ownership-docs' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'properties' AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.landlord_id = auth.uid()
    ))
    OR owner = auth.uid()
  )
);

-- 6. UPDATE: only the owning landlord.
CREATE POLICY "landlord_documents_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (
    ((storage.foldername(name))[1] = 'ownership-docs' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'properties' AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.landlord_id = auth.uid()
    ))
    OR owner = auth.uid()
  )
);

-- 7. DELETE: only the owning landlord.
CREATE POLICY "landlord_documents_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (
    ((storage.foldername(name))[1] = 'ownership-docs' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'properties' AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.landlord_id = auth.uid()
    ))
    OR owner = auth.uid()
  )
);
